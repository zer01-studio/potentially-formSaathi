import { withApi } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/response";
import { getUserById } from "@/lib/auth/session";

export const runtime = "nodejs";

export const GET = withApi({ auth: "optional" }, async ({ auth }) => {
  if (!auth) {
    return apiSuccess({ user: null });
  }

  const user = await getUserById(auth.userId);
  return apiSuccess({ user });
});
