import type { z } from "zod";
import { ApiHttpError } from "./errors";

export async function readJsonBody(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new ApiHttpError(
      415,
      "unsupported_media_type",
      "Send this request as JSON.",
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new ApiHttpError(413, "payload_too_large", "That request is too large.");
  }

  try {
    return await request.json();
  } catch {
    throw new ApiHttpError(
      400,
      "invalid_json",
      "That request didn't include valid JSON.",
    );
  }
}

export function parseWithSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }

  throw new ApiHttpError(
    400,
    "validation_failed",
    "Please check the highlighted fields and try again.",
    { fieldErrors },
  );
}
