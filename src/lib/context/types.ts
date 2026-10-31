export const CONTEXT_CATEGORIES = [
  "identity",
  "contact",
  "address",
  "work",
  "preferences",
  "other",
] as const;

export type ContextCategory = (typeof CONTEXT_CATEGORIES)[number];

export const CONTEXT_CATEGORY_LABELS: Record<ContextCategory, string> = {
  identity: "Identity",
  contact: "Contact",
  address: "Address",
  work: "Work",
  preferences: "Preferences",
  other: "Other",
};

export type ContextItemDto = {
  id: string;
  category: ContextCategory;
  label: string;
  value: string;
  key: string | null;
  autofillKey: string | null;
  source: "manual" | "form_answer";
  sourceFormId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContextListResponse = {
  items: ContextItemDto[];
  savingEnabled: boolean;
};

export const AUTOFILL_KEYS = [
  "fullName",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "postalCode",
  "country",
  "dateOfBirth",
  "company",
  "website",
] as const;

export type AutofillKey = (typeof AUTOFILL_KEYS)[number];

export const AUTOFILL_KEY_LABELS: Record<AutofillKey, string> = {
  fullName: "Full name",
  email: "Email address",
  phone: "Phone number",
  address: "Street address",
  city: "City",
  state: "State / province",
  postalCode: "PIN / postal code",
  country: "Country / region",
  dateOfBirth: "Date of birth",
  company: "Company / employer",
  website: "Website",
};

export const AUTOFILL_KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9]{0,39}$/;
