import "server-only";
import { AuthError, type AuthProvider, type AuthUser } from "./types";

/**
 * TODO(oauth): Implement the Google OAuth provider (authorization code flow,
 * PKCE, verified email mapping to a user record, then a normal app session).
 * Keep this stub until credentials and the consent screen are set up.
 * Do not enable it in AUTH_MODE yet; only "mock" is a supported mode.
 */
export class GoogleOAuthProvider implements AuthProvider {
  readonly id = "google";

  async signUp(): Promise<AuthUser> {
    throw new AuthError("NOT_IMPLEMENTED", "Google sign-in isn't available yet.");
  }

  async signIn(): Promise<AuthUser> {
    throw new AuthError("NOT_IMPLEMENTED", "Google sign-in isn't available yet.");
  }
}
