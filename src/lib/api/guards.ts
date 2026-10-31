import "server-only";
import type { ApiAuth } from "@/lib/auth/api-auth";
import { ApiHttpError } from "./errors";

export function requireAuth(auth: ApiAuth | null): asserts auth is ApiAuth {
  if (!auth) {
    throw new ApiHttpError(401, "auth_required", "Please sign in to continue.");
  }
}

export function requireSessionAuth(
  auth: ApiAuth | null,
): asserts auth is { kind: "session"; userId: string } {
  if (!auth) {
    throw new ApiHttpError(401, "auth_required", "Please sign in to continue.");
  }
  if (auth.kind !== "session") {
    throw new ApiHttpError(
      403,
      "session_required",
      "This action needs a signed-in web session. Access tokens can read forms but can’t change them.",
    );
  }
}
