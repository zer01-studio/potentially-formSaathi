import { withApi } from "@/lib/api/handler";
import { requireAuth } from "@/lib/api/guards";
import { parseWithSchema, readJsonBody } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import { assistFields } from "@/lib/extension/assist";
import { assistRequestSchema } from "@/lib/extension/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = withApi(
  {
    auth: "required",
    scopes: ["autofill:read"],
    tokenRateLimit: {
      limit: 20,
      windowMs: 60_000,
      namespace: "extension-assist",
    },
    userRateLimit: {
      limit: 30,
      windowMs: 60_000,
      namespace: "extension-assist-user",
    },
  },
  async ({ request, auth }) => {
    requireAuth(auth);
    const body = parseWithSchema(assistRequestSchema, await readJsonBody(request));
    const result = await assistFields({ userId: auth.userId, request: body });
    return apiSuccess(result);
  },
);
