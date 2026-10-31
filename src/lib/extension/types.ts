import { z } from "zod";

export const PAGE_FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "date",
  "number",
  "textarea",
  "select",
  "radio",
  "checkbox",
] as const;

export const pageFieldSchema = z.strictObject({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().max(200).default(""),
  name: z.string().trim().max(120).optional(),
  inputType: z.enum(PAGE_FIELD_TYPES).default("text"),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().max(120)).max(30).optional(),
  helpText: z.string().trim().max(300).optional(),
  autocomplete: z.string().trim().max(60).optional(),
  placeholder: z.string().trim().max(160).optional(),
});

export const candidateSchema = z.strictObject({
  key: z.string().trim().min(1).max(80),
  label: z.string().trim().max(200).default(""),
  value: z.string().trim().min(1).max(2000),
  type: z.string().trim().max(40).optional(),
});

export const assistRequestSchema = z.strictObject({
  page: z.strictObject({
    url: z.string().trim().max(2048).default(""),
    title: z.string().trim().max(200).default(""),
    fields: z.array(pageFieldSchema).max(40),
  }),
  candidates: z.array(candidateSchema).max(60).default([]),
});

export type PageField = z.infer<typeof pageFieldSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type AssistRequest = z.infer<typeof assistRequestSchema>;

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/**
 * `matched` may be applied after review, `ambiguous` needs the person to
 * decide, `missing` has no usable candidate at all.
 */
export type MatchStatus = "matched" | "ambiguous" | "missing";

export type FieldMatch = {
  fieldId: string;
  candidateKey: string | null;
  value: string | null;
  confidence: Confidence;
  status: MatchStatus;
  reason: string;
  question: string | null;
  guidance: string | null;
};

export type AssistResponse = {
  mode: "ai" | "rules";
  matches: FieldMatch[];
  notes: string[];
};

export function statusForConfidence(
  candidateKey: string | null,
  confidence: Confidence,
): MatchStatus {
  if (!candidateKey || confidence === "low") return "missing";
  return confidence === "high" ? "matched" : "ambiguous";
}
