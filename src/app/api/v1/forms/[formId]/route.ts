import { withApi } from "@/lib/api/handler";
import { requireAuth } from "@/lib/api/guards";
import { parseWithSchema } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import { getFormDetailForUser } from "@/lib/forms/service";
import { objectIdSchema } from "@/lib/validation/forms";

export const runtime = "nodejs";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export const GET = withApi(
  { auth: "required", scopes: ["forms:read"] },
  async ({ auth, params }) => {
    requireAuth(auth);

    const formId = parseWithSchema(objectIdSchema, firstParam(params.formId));
    const form = await getFormDetailForUser(auth.userId, formId);

    return apiSuccess({ form });
  },
);
