import { NextResponse } from "next/server";
import { withApi } from "@/lib/api/handler";
import { requireAuth } from "@/lib/api/guards";
import { parseWithSchema } from "@/lib/api/json";
import { buildFormExport } from "@/lib/forms/service";
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
    const { payload, fileName } = await buildFormExport(auth.userId, formId);

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  },
);
