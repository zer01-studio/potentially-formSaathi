const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Authorization,Content-Type,X-CSRF-Token";
const MAX_AGE_SECONDS = "600";

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function isOriginAllowed(
  origin: string | null,
  selfOrigin: string,
  allowedRaw: string | undefined = process.env.EXTENSION_ALLOWED_ORIGINS,
): boolean {
  if (!origin) return true;
  return origin === selfOrigin || parseAllowedOrigins(allowedRaw).includes(origin);
}

export function corsHeaders(
  origin: string | null,
  selfOrigin: string,
  allowedRaw: string | undefined = process.env.EXTENSION_ALLOWED_ORIGINS,
): Headers {
  const headers = new Headers();
  headers.set("Vary", "Origin");
  if (origin && isOriginAllowed(origin, selfOrigin, allowedRaw)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return headers;
}

export function corsPreflightHeaders(
  origin: string | null,
  selfOrigin: string,
  allowedRaw: string | undefined = process.env.EXTENSION_ALLOWED_ORIGINS,
): Headers {
  const headers = corsHeaders(origin, selfOrigin, allowedRaw);
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  headers.set("Access-Control-Max-Age", MAX_AGE_SECONDS);
  return headers;
}
