import { z } from "zod";

const httpUrlSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .url({ message: "That link doesn’t look like a valid web address." })
    .max(2048, { message: "That link is too long." })
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "Use a link that starts with http:// or https://.",
    }),
);

export const instructionsSchema = z
  .string()
  .trim()
  .max(1000, { message: "Keep the notes under 1,000 characters." })
  .optional();

export const attachUrlSchema = z.strictObject({
  url: httpUrlSchema,
  instructions: instructionsSchema,
});

export const answerSchema = z.strictObject({
  value: z
    .string({ message: "Enter an answer." })
    .max(2000, { message: "This answer is too long." }),
});

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, { message: "We couldn’t find that form." });

export const fieldKeySchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/, { message: "We couldn’t find that question." });

export type AttachUrlInput = z.infer<typeof attachUrlSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
