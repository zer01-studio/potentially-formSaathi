import { z } from "zod";

const emailSchema = z.preprocess(
  (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  z
    .email({
      message: "That email address doesn't look right. Check for typos.",
    })
    .max(254, { message: "That email address is too long." }),
);

const passwordSchema = z
  .string()
  .min(1, { message: "Enter a password." })
  .min(8, { message: "Use at least 8 characters for your password." })
  .max(128, { message: "That password is too long (128 characters maximum)." });

export const credentialsSchema = z.strictObject({
  email: emailSchema,
  password: passwordSchema,
});

export type CredentialsInput = z.infer<typeof credentialsSchema>;
