export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type SignUpInput = {
  email: string;
  password: string;
};

export type AuthErrorCode =
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "NOT_IMPLEMENTED";

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/**
 * The web app talks to this interface only, so the mock credentials provider
 * can be replaced by Google (or another OAuth provider) without touching
 * routes, UI, or session code.
 */
export interface AuthProvider {
  readonly id: string;
  signUp(input: SignUpInput): Promise<AuthUser>;
  signIn(input: SignUpInput): Promise<AuthUser>;
}
