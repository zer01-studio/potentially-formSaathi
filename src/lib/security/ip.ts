import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

export function hashForRateLimit(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}
