import { withApi } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { clearSessionCookie, deleteSessionByToken } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/security/constants";

export const runtime = "nodejs";

export const POST = withApi({ auth: "optional" }, async ({ request }) => {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteSessionByToken(token);
  }

  const response = apiSuccess({ signedOut: true });
  clearSessionCookie(response);
  return response;
});
