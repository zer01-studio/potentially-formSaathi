import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { resolveApiAuth, type ApiAuth } from "@/lib/auth/api-auth";
import type { Scope } from "@/lib/auth/scopes";
import { AuthError } from "@/lib/auth/types";
import { DatabaseUnavailableError } from "@/lib/db/connect";
import { corsHeaders, isOriginAllowed } from "@/lib/security/cors";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/security/constants";
import { verifyCsrfToken } from "@/lib/security/csrf";
import { getClientIp, hashForRateLimit } from "@/lib/security/ip";
import { logEvent, logWarn } from "@/lib/security/log";
import { rateLimiter } from "@/lib/security/rate-limit";
import { ApiHttpError, type ApiErrorDetails } from "./errors";
import { apiError } from "./response";

export type ApiOptions = {
  auth?: "none" | "optional" | "required";
  scopes?: Scope[];
  rateLimit?: { limit: number; windowMs: number; namespace: string };
  userRateLimit?: { limit: number; windowMs: number; namespace: string };
};

export type ApiContext = {
  request: NextRequest;
  auth: ApiAuth | null;
  params: Record<string, string | string[]>;
};

export type ApiRouteHandler = (context: ApiContext) => Promise<Response> | Response;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

async function resolveRouteParams(
  context: unknown,
): Promise<Record<string, string | string[]>> {
  if (!context || typeof context !== "object") return {};
  const raw = (context as { params?: unknown }).params;
  if (!raw) return {};

  const resolved = await raw;
  if (!resolved || typeof resolved !== "object") return {};

  const params: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(resolved as Record<string, unknown>)) {
    if (typeof value === "string" || Array.isArray(value)) {
      params[key] = value as string | string[];
    }
  }
  return params;
}

export function withApi(options: ApiOptions, handler: ApiRouteHandler) {
  return async function apiRoute(
    request: NextRequest,
    context?: unknown,
  ): Promise<Response> {
    const params = await resolveRouteParams(context);
    const start = Date.now();
    const origin = request.headers.get("origin");
    const selfOrigin = request.nextUrl.origin;
    let authKind = "none";

    try {
      if (!isOriginAllowed(origin, selfOrigin)) {
        throw new ApiHttpError(
          403,
          "origin_not_allowed",
          "Requests from this origin aren't allowed.",
        );
      }

      if (options.rateLimit) {
        const key = `${options.rateLimit.namespace}:${hashForRateLimit(getClientIp(request))}`;
        const result = rateLimiter.consume(
          key,
          options.rateLimit.limit,
          options.rateLimit.windowMs,
        );

        if (!result.allowed) {
          return rateLimited(request, origin, selfOrigin, "none", start, result.retryAfterSeconds);
        }
      }

      const auth = await resolveApiAuth(request);
      authKind = auth?.kind ?? "none";

      if (options.userRateLimit && auth) {
        const key = `${options.userRateLimit.namespace}:user:${hashForRateLimit(auth.userId)}`;
        const result = rateLimiter.consume(
          key,
          options.userRateLimit.limit,
          options.userRateLimit.windowMs,
        );

        if (!result.allowed) {
          return rateLimited(request, origin, selfOrigin, authKind, start, result.retryAfterSeconds);
        }
      }

      if (options.auth === "required" && !auth) {
        throw new ApiHttpError(401, "auth_required", "Please sign in to continue.");
      }

      if (auth?.kind === "session" && !SAFE_METHODS.has(request.method)) {
        const csrfValid = verifyCsrfToken(
          request.headers.get(CSRF_HEADER),
          request.cookies.get(CSRF_COOKIE)?.value,
        );
        if (!csrfValid) {
          throw new ApiHttpError(
            403,
            "csrf_failed",
            "Your session needs a refresh. Reload the page and try again.",
          );
        }
      }

      if (auth?.kind === "token" && options.scopes?.length) {
        const missingScopes = options.scopes.filter(
          (scope) => !auth.scopes.includes(scope),
        );
        if (missingScopes.length > 0) {
          throw new ApiHttpError(
            403,
            "insufficient_scope",
            "This access token doesn't have permission for that action.",
            { missingScopes },
          );
        }
      }

      const response = await handler({ request, auth, params });
      return finalize(response, request, origin, selfOrigin, authKind, start);
    } catch (error) {
      const response = errorToResponse(error);
      logWarn("api.request_failed", {
        route: request.nextUrl.pathname,
        method: request.method,
        status: response.status,
        auth: authKind,
      });
      return finalize(response, request, origin, selfOrigin, authKind, start);
    }
  };
}

function rateLimited(
  request: NextRequest,
  origin: string | null,
  selfOrigin: string,
  authKind: string,
  start: number,
  retryAfterSeconds: number,
): Response {
  logWarn("api.rate_limited", { route: request.nextUrl.pathname });
  const limited = apiError(
    429,
    "rate_limited",
    "Too many requests. Please wait a moment and try again.",
    undefined,
    { "Retry-After": String(retryAfterSeconds) },
  );
  return finalize(limited, request, origin, selfOrigin, authKind, start);
}

function finalize(
  response: Response,
  request: NextRequest,
  origin: string | null,
  selfOrigin: string,
  authKind: string,
  start: number,
): Response {
  const headers = corsHeaders(origin, selfOrigin);
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "vary") {
      const existing = response.headers.get("Vary");
      response.headers.set("Vary", existing ? `${existing}, ${value}` : value);
    } else {
      response.headers.set(key, value);
    }
  });

  if (!response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", "no-store");
  }

  logEvent("api.request", {
    method: request.method,
    route: request.nextUrl.pathname,
    status: response.status,
    ms: Date.now() - start,
    auth: authKind,
  });

  return response;
}

function errorToResponse(error: unknown): NextResponse {
  if (error instanceof ApiHttpError) {
    return apiError(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return apiError(400, "validation_failed", "Please check the highlighted fields and try again.", {
      fieldErrors: fieldErrorsFromZod(error),
    });
  }

  if (error instanceof AuthError) {
    switch (error.code) {
      case "EMAIL_TAKEN":
        return apiError(409, "email_taken", error.message, {
          fieldErrors: { email: error.message },
        });
      case "INVALID_CREDENTIALS":
        return apiError(401, "invalid_credentials", error.message, {
          fieldErrors: { password: error.message },
        });
      case "NOT_IMPLEMENTED":
        return apiError(501, "not_implemented", error.message);
    }
  }

  if (error instanceof DatabaseUnavailableError || isDatabaseAvailabilityError(error)) {
    logWarn("api.database_unavailable");
    return apiError(
      503,
      "database_unavailable",
      "FormSaathi can't reach its database right now. Please try again in a moment.",
    );
  }

  logWarn("api.unexpected_error", {
    error: error instanceof Error ? error.name : "unknown",
    message: redactSecrets(error instanceof Error ? error.message : String(error)),
  });
  return apiError(
    500,
    "internal_error",
    "Something went wrong on our side. Please try again.",
  );
}

function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function isDatabaseAvailabilityError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return [
    "MongooseServerSelectionError",
    "MongoServerSelectionError",
    "MongoNetworkError",
    "MongoNetworkTimeoutError",
    "MongoTimeoutError",
  ].includes(error.name);
}

function redactSecrets(message: string): string {
  return message
    .replace(/mongodb(\+srv)?:\/\/[^\s"'`]+/gi, "mongodb://[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]");
}

export type { ApiErrorDetails };
