import { withApi } from "@/lib/api/handler";
import { parseWithSchema, readJsonBody } from "@/lib/api/json";
import { apiSuccess } from "@/lib/api/response";
import { authProvider } from "@/lib/auth/provider";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { credentialsSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

export const POST = withApi(
  {
    auth: "none",
    rateLimit: { limit: 10, windowMs: 60_000, namespace: "auth-login" },
  },
  async ({ request }) => {
    const body = parseWithSchema(credentialsSchema, await readJsonBody(request));
    const user = await authProvider.signIn(body);
    const session = await createSession(user.id);

    const response = apiSuccess({ user });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  },
);
