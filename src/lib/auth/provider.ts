import "server-only";
import { connectDb } from "@/lib/db/connect";
import { User } from "@/lib/db/models/user";
import {
  AuthError,
  type AuthProvider,
  type AuthUser,
  type SignUpInput,
} from "./types";
import {
  equalizeFailedSignInTiming,
  hashPassword,
  verifyPassword,
} from "./password";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function toAuthUser(user: {
  _id: unknown;
  email: string;
  createdAt?: Date | null;
}): AuthUser {
  return {
    id: String(user._id),
    email: user.email,
    createdAt: (user.createdAt ?? new Date()).toISOString(),
  };
}

class MockCredentialsAuthProvider implements AuthProvider {
  readonly id = "credentials";

  async signUp(input: SignUpInput): Promise<AuthUser> {
    await connectDb();

    try {
      const user = await User.create({
        email: input.email,
        passwordHash: await hashPassword(input.password),
      });
      return toAuthUser(user);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AuthError(
          "EMAIL_TAKEN",
          "An account already exists for that email. Try signing in instead.",
        );
      }
      throw error;
    }
  }

  async signIn(input: SignUpInput): Promise<AuthUser> {
    await connectDb();

    const user = await User.findOne({ email: input.email })
      .select("+passwordHash")
      .lean();

    if (!user) {
      await equalizeFailedSignInTiming(input.password);
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "That email and password don't match our records. Try again, or create an account.",
      );
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AuthError(
        "INVALID_CREDENTIALS",
        "That email and password don't match our records. Try again, or create an account.",
      );
    }

    return toAuthUser(user);
  }
}

export const authProvider: AuthProvider = new MockCredentialsAuthProvider();

// TODO(oauth): swap the provider above for GoogleOAuthProvider (./google.ts)
// once OAuth is implemented. Everything else already talks to AuthProvider.
