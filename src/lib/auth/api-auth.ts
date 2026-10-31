import "server-only";
import type { NextRequest } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { ApiToken } from "@/lib/db/models/api-token";
import { SESSION_COOKIE } from "@/lib/security/constants";
import { findSessionUserId, hashToken } from "./session";
import type { Scope } from "./scopes";

export type ApiAuth =
  | { kind: "session"; userId: string }
  | {
      kind: "token";
      userId: string;
      tokenId: string;
      scopes: Scope[];
    };

const BEARER_PREFIX = /^Bearer\s+/i;

export async function resolveApiAuth(request: NextRequest): Promise<ApiAuth | null> {
  const authorization = request.headers.get("authorization");

  if (authorization) {
    if (!BEARER_PREFIX.test(authorization)) return null;

    const token = authorization.replace(BEARER_PREFIX, "").trim();
    if (!token || token.length > 256) return null;

    await connectDb();

    const now = new Date();
    const record = await ApiToken.findOne({
      tokenHash: hashToken(token),
      revokedAt: null,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).lean();

    if (!record) return null;

    await ApiToken.updateOne({ _id: record._id }, { $set: { lastUsedAt: now } });

    return {
      kind: "token",
      userId: String(record.userId),
      tokenId: String(record._id),
      scopes: record.scopes as Scope[],
    };
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;

  const userId = await findSessionUserId(sessionToken);
  return userId ? { kind: "session", userId } : null;
}
