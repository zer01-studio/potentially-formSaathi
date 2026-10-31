import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { withApi } from "@/lib/api/handler";
import { requireSessionAuth } from "@/lib/api/guards";
import { parseWithSchema, readJsonBody } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import { SCOPES, type Scope } from "@/lib/auth/scopes";
import { connectDb } from "@/lib/db/connect";
import { ApiToken } from "@/lib/db/models/api-token";
import { logEvent } from "@/lib/security/log";

export const runtime = "nodejs";

const issueTokenSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "Give the token a name." })
    .max(80, { message: "Keep the name under 80 characters." }),
  scopes: z
    .array(z.enum(SCOPES))
    .min(1, { message: "Choose at least one scope." })
    .max(SCOPES.length),
});

type TokenLike = {
  _id: unknown;
  name: string;
  scopes: string[];
  createdAt?: Date | null;
  lastUsedAt?: Date | null;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
};

function toTokenDto(token: TokenLike) {
  return {
    id: String(token._id),
    name: token.name,
    scopes: token.scopes,
    createdAt: (token.createdAt ?? new Date()).toISOString(),
    lastUsedAt: token.lastUsedAt ? token.lastUsedAt.toISOString() : null,
    expiresAt: token.expiresAt ? token.expiresAt.toISOString() : null,
    revokedAt: token.revokedAt ? token.revokedAt.toISOString() : null,
  };
}

export const GET = withApi({ auth: "required" }, async ({ auth }) => {
  requireSessionAuth(auth);
  await connectDb();

  const tokens = await ApiToken.find({ userId: auth.userId })
    .select("name scopes createdAt lastUsedAt expiresAt revokedAt")
    .sort({ createdAt: -1 })
    .lean();

  return apiSuccess({
    tokens: tokens.map((token) => toTokenDto(token as TokenLike)),
    scopes: SCOPES,
  });
});

export const POST = withApi({ auth: "required" }, async ({ request, auth }) => {
  requireSessionAuth(auth);
  const body = parseWithSchema(
    issueTokenSchema,
    await readJsonBody(request),
  );

  await connectDb();

  const rawToken = `fs_${randomBytes(32).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const created = await ApiToken.create({
    userId: auth.userId,
    name: body.name,
    tokenHash,
    scopes: body.scopes as Scope[],
    expiresAt,
  });

  logEvent("token.issued", {
    tokenId: String(created._id),
    scopes: body.scopes.length,
  });

  return apiSuccess(
    {
      token: rawToken,
      apiToken: toTokenDto(created.toObject() as TokenLike),
      warning: "Copy this token now. It won’t be shown again.",
    },
    { status: 201 },
  );
});
