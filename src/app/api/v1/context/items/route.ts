import { withApi } from "@/lib/api/handler";
import { requireAuth } from "@/lib/api/guards";
import { parseWithSchema, readJsonBody } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import {
  clearContextItems,
  createContextItem,
  listContextItems,
} from "@/lib/context/service";
import { contextItemCreateSchema } from "@/lib/validation/context";

export const runtime = "nodejs";

export const GET = withApi(
  { auth: "required", scopes: ["context:read"] },
  async ({ auth }) => {
    requireAuth(auth);
    const data = await listContextItems(auth.userId);
    return apiSuccess(data);
  },
);

export const POST = withApi(
  { auth: "required", scopes: ["context:write"] },
  async ({ request, auth }) => {
    requireAuth(auth);
    const body = parseWithSchema(
      contextItemCreateSchema,
      await readJsonBody(request),
    );

    const item = await createContextItem({
      userId: auth.userId,
      category: body.category,
      label: body.label,
      value: body.value,
      autofillKey: body.autofillKey,
    });

    return apiSuccess({ item }, { status: 201 });
  },
);

export const DELETE = withApi(
  { auth: "required", scopes: ["context:write"] },
  async ({ auth }) => {
    requireAuth(auth);
    const deleted = await clearContextItems(auth.userId);
    return apiSuccess({ deleted });
  },
);
