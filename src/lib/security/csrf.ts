import { createHash, timingSafeEqual } from "node:crypto";

export function verifyCsrfToken(
  headerToken: string | null | undefined,
  cookieToken: string | null | undefined,
): boolean {
  if (!headerToken || !cookieToken) return false;
  if (headerToken.length > 256 || cookieToken.length > 256) return false;

  const headerDigest = createHash("sha256").update(headerToken).digest();
  const cookieDigest = createHash("sha256").update(cookieToken).digest();
  return timingSafeEqual(headerDigest, cookieDigest);
}
