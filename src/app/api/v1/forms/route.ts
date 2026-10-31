import { withApi } from "@/lib/api/handler";
import { requireAuth } from "@/lib/api/guards";
import { apiSuccess } from "@/lib/api/response";
import { listFormsForUser } from "@/lib/forms/service";

export const runtime = "nodejs";

export const GET = withApi(
  { auth: "required", scopes: ["forms:read"] },
  async ({ auth }) => {
    requireAuth(auth);
    const forms = await listFormsForUser(auth.userId);
    return apiSuccess({ forms });
  },
);
