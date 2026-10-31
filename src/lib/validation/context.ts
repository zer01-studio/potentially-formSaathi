import { z } from "zod";
import {
  AUTOFILL_KEY_PATTERN,
  CONTEXT_CATEGORIES,
} from "@/lib/context/types";

const autofillKeySchema = z
  .string()
  .trim()
  .max(40, { message: "Autofill keys must be 40 characters or fewer." })
  .regex(AUTOFILL_KEY_PATTERN, {
    message: "Use a camelCase key like fullName, email, or dateOfBirth.",
  })
  .nullable()
  .optional();

export const contextItemCreateSchema = z.strictObject({
  category: z.enum(CONTEXT_CATEGORIES),
  label: z
    .string()
    .trim()
    .min(1, { message: "Add a short label." })
    .max(120, { message: "Keep the label under 120 characters." }),
  value: z
    .string()
    .trim()
    .min(1, { message: "Add a value." })
    .max(2000, { message: "This value is too long." }),
  autofillKey: autofillKeySchema,
});

export const contextItemUpdateSchema = z
  .strictObject({
    category: z.enum(CONTEXT_CATEGORIES).optional(),
    label: z.string().trim().min(1).max(120).optional(),
    value: z.string().trim().min(1).max(2000).optional(),
    autofillKey: autofillKeySchema,
  })
  .refine(
    (value) =>
      value.category !== undefined ||
      value.label !== undefined ||
      value.value !== undefined ||
      value.autofillKey !== undefined,
    { message: "Nothing to update." },
  );

export type ContextItemCreateInput = z.infer<typeof contextItemCreateSchema>;
