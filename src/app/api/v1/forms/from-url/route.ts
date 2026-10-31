import { withApi } from "@/lib/api/handler";
import { requireSessionAuth } from "@/lib/api/guards";
import { parseWithSchema, readJsonBody } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import { env } from "@/lib/env";
import { createFormFromUrl } from "@/lib/forms/attachments";
import { attachUrlSchema } from "@/lib/validation/forms";

export const runtime = "nodejs";

export const POST = withApi(
  {
    auth: "required",
    scopes: ["forms:read"],
    rateLimit: {
      limit: env.RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
      namespace: "forms-from-url",
    },
    userRateLimit: {
      limit: env.RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
      namespace: "forms-from-url",
    },
  },
  async ({ request, auth }) => {
    requireSessionAuth(auth);

    const body = parseWithSchema(attachUrlSchema, await readJsonBody(request));
    const form = await createFormFromUrl({ userId: auth.userId, url: body.url });

    return apiSuccess({ form }, { status: 201 });
  },
);
