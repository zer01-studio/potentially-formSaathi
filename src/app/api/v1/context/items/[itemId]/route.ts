import { ApiHttpError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { requireAuth } from "@/lib/api/guards";
import { parseWithSchema, readJsonBody } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import {
  deleteContextItem,
  updateContextItem,
} from "@/lib/context/service";
import { contextItemUpdateSchema } from "@/lib/validation/context";
import { objectIdSchema } from "@/lib/validation/forms";

export const runtime = "nodejs";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export const PATCH = withApi(
  { auth: "required", scopes: ["context:write"] },
  async ({ request, auth, params }) => {
    requireAuth(auth);
    const itemId = parseWithSchema(objectIdSchema, firstParam(params.itemId));
    const body = parseWithSchema(
      contextItemUpdateSchema,
      await readJsonBody(request),
    );

    const item = await updateContextItem({
      userId: auth.userId,
      itemId,
      category: body.category,
      label: body.label,
      value: body.value,
      autofillKey: body.autofillKey,
    });

    if (!item) {
      throw new ApiHttpError(404, "not_found", "We couldn’t find that saved detail.");
    }

    return apiSuccess({ item });
  },
);

export const DELETE = withApi(
  { auth: "required", scopes: ["context:write"] },
  async ({ auth, params }) => {
    requireAuth(auth);
    const itemId = parseWithSchema(objectIdSchema, firstParam(params.itemId));
    const deleted = await deleteContextItem({ userId: auth.userId, itemId });

    if (!deleted) {
      throw new ApiHttpError(404, "not_found", "We couldn’t find that saved detail.");
    }

    return apiSuccess({ deleted: true });
  },
);
