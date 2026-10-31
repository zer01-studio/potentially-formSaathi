import { withApi } from "@/lib/api/handler";
import { apiError } from "@/lib/api/response";

export const runtime = "nodejs";

const notFound = withApi({ auth: "none" }, async () =>
  apiError(
    404,
    "not_found",
    "That API endpoint doesn't exist. Check docs/extension-api.md for available routes.",
  ),
);

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
