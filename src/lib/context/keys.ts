import { fieldCategory } from "@/lib/forms/field-rules";
import type { FormFieldDto } from "@/lib/forms/types";
import type { ContextCategory } from "./types";

export type FieldContextDescriptor = {
  key: string;
  label: string;
  category: ContextCategory;
};

const DESCRIPTORS: Record<
  string,
  { key: string; label: string; category: ContextCategory }
> = {
  email: { key: "email", label: "Email address", category: "contact" },
  phone: { key: "phone", label: "Phone number", category: "contact" },
  name: { key: "fullName", label: "Full name", category: "identity" },
  address: { key: "address", label: "Street address", category: "address" },
  city: { key: "city", label: "City", category: "address" },
  state: { key: "state", label: "State / province", category: "address" },
  postal: { key: "postalCode", label: "PIN / postal code", category: "address" },
  country: { key: "country", label: "Country / region", category: "address" },
  company: { key: "company", label: "Company / employer", category: "work" },
  website: { key: "website", label: "Website", category: "work" },
};

/**
 * Maps a form field to a safe, reusable detail. Only recognisable, low-risk
 * fields are saved; free-text answers (statements, reasons, etc.) are not.
 */
export function contextDescriptorForField(
  field: FormFieldDto,
): FieldContextDescriptor | null {
  const category = fieldCategory(field.question);
  if (!category) return null;

  if (category === "date") {
    if (!/\b(birth|dob|born)\b/i.test(field.question)) return null;
    return { key: "dateOfBirth", label: "Date of birth", category: "identity" };
  }

  return DESCRIPTORS[category] ?? null;
}
