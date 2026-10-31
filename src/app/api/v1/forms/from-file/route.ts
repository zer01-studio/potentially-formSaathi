import { ApiHttpError } from "@/lib/api/errors";
import { withApi } from "@/lib/api/handler";
import { requireSessionAuth } from "@/lib/api/guards";
import { apiSuccess } from "@/lib/api/response";
import { env } from "@/lib/env";
import { createFormFromFile } from "@/lib/forms/attachments";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = withApi(
  {
    auth: "required",
    scopes: ["forms:read"],
    rateLimit: {
      limit: env.RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
      namespace: "forms-from-file",
    },
    userRateLimit: {
      limit: env.RATE_LIMIT_PER_MINUTE,
      windowMs: 60_000,
      namespace: "forms-from-file",
    },
  },
  async ({ request, auth }) => {
    requireSessionAuth(auth);

    const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("multipart/form-data")) {
      throw new ApiHttpError(
        415,
        "unsupported_media_type",
        "Send this file as a multipart form upload.",
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new ApiHttpError(
        400,
        "invalid_form_data",
        "We couldn’t read that upload. Try again.",
      );
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ApiHttpError(400, "file_required", "Choose a PDF or photo first.");
    }

    const form = await createFormFromFile({ userId: auth.userId, file });

    return apiSuccess({ form }, { status: 201 });
  },
);
