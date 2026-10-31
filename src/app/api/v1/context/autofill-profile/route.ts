import { withApi } from "@/lib/api/handler";
import { requireAuth } from "@/lib/api/guards";
import { apiSuccess } from "@/lib/api/response";
import { getAutofillProfile } from "@/lib/context/service";
import { logEvent } from "@/lib/security/log";

export const runtime = "nodejs";

export const GET = withApi(
  {
    auth: "required",
    scopes: ["autofill:read"],
    tokenRateLimit: {
      limit: 60,
      windowMs: 60_000,
      namespace: "autofill-profile",
    },
  },
  async ({ auth }) => {
    requireAuth(auth);
    const { profile, count } = await getAutofillProfile(auth.userId);

    if (auth.kind === "token") {
      logEvent("autofill.profile_read", {
        tokenId: auth.tokenId,
        scopes: auth.scopes.join(","),
        fields: count,
      });
    }

    return apiSuccess(profile);
  },
);
