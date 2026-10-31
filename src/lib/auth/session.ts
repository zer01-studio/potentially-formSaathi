import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { connectDb, DatabaseUnavailableError } from "@/lib/db/connect";
import { Session } from "@/lib/db/models/session";
import { User } from "@/lib/db/models/user";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/security/constants";
import { logWarn } from "@/lib/security/log";
import type { AuthUser } from "./types";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  await connectDb();

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await Session.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function deleteSessionByToken(token: string): Promise<void> {
  try {
    await connectDb();
  } catch {
    return;
  }
  await Session.deleteOne({ tokenHash: hashToken(token) });
}

export async function findSessionUserId(token: string): Promise<string | null> {
  await connectDb();
  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();

  return session ? String(session.userId) : null;
}

export async function getUserById(userId: string): Promise<AuthUser | null> {
  await connectDb();
  const user = await User.findById(userId).select("email createdAt").lean();
  if (!user) return null;

  return {
    id: String(user._id),
    email: user.email,
    createdAt: new Date(user.createdAt ?? new Date()).toISOString(),
  };
}

/** Server-component helper. Returns null on missing/expired session or DB issues. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const userId = await findSessionUserId(token);
    if (!userId) return null;
    return await getUserById(userId);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) return null;
    logWarn("auth.session_lookup_failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
}
