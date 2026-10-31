import "server-only";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let dummyHash: string | null = null;

/** Keeps failed-login timing similar whether or not the email exists. */
export async function equalizeFailedSignInTiming(password: string): Promise<void> {
  dummyHash ??= await bcrypt.hash("formsaathi-timing-equalizer", BCRYPT_ROUNDS);
  await bcrypt.compare(password, dummyHash);
}
