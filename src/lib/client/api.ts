import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/security/constants";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

type ApiEnvelope<T> = {
  apiVersion?: string;
  ok?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: { fieldErrors?: Record<string, string> };
  };
};

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const found = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return found ? decodeURIComponent(found.slice(prefix.length)) : null;
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (method !== "GET" && method !== "HEAD") {
    const csrfToken = readCookie(CSRF_COOKIE);
    if (csrfToken) headers[CSRF_HEADER] = csrfToken;
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
      signal: options.signal,
    });
  } catch {
    throw new ApiClientError(
      "We couldn’t reach FormSaathi. Check your connection and try again.",
      0,
      "network_error",
    );
  }

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new ApiClientError(
      payload?.error?.message ?? "Something went wrong. Please try again.",
      response.status,
      payload?.error?.code ?? "request_failed",
      payload?.error?.details?.fieldErrors,
    );
  }

  return payload.data as T;
}
