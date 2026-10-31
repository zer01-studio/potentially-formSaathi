import { withApi } from "@/lib/api/handler";
import { requireSessionAuth } from "@/lib/api/guards";
import { parseWithSchema, readJsonBody } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import { saveAnswerForUser } from "@/lib/forms/service";
import {
  answerSchema,
  fieldKeySchema,
  objectIdSchema,
} from "@/lib/validation/forms";

export const runtime = "nodejs";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export const PATCH = withApi({ auth: "required" }, async ({ request, auth, params }) => {
  requireSessionAuth(auth);

  const formId = parseWithSchema(objectIdSchema, firstParam(params.formId));
  const fieldKey = parseWithSchema(fieldKeySchema, firstParam(params.fieldKey));
  const body = parseWithSchema(answerSchema, await readJsonBody(request));

  const answer = await saveAnswerForUser({
    userId: auth.userId,
    formId,
    fieldKey,
    value: body.value,
  });

  return apiSuccess({ answer });
});
