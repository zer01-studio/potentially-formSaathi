import { ApiHttpError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { requireSessionAuth } from "@/lib/api/guards";
import { parseWithSchema } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import { connectDb } from "@/lib/db/connect";
import { ApiToken } from "@/lib/db/models/api-token";
import { objectIdSchema } from "@/lib/validation/forms";

export const runtime = "nodejs";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export const DELETE = withApi({ auth: "required" }, async ({ auth, params }) => {
  requireSessionAuth(auth);
  const tokenId = parseWithSchema(objectIdSchema, firstParam(params.tokenId));

  await connectDb();
  const revoked = await ApiToken.findOneAndUpdate(
    {
      _id: tokenId,
      userId: auth.userId,
      revokedAt: null,
    },
    { $set: { revokedAt: new Date() } },
    { new: true },
  ).lean();

  if (!revoked) {
    throw new ApiHttpError(404, "not_found", "We couldn’t find that token.");
  }

  return apiSuccess({ revoked: true });
});
