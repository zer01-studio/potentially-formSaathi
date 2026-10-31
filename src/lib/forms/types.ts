export const FIELD_TYPES = [
  "text",
  "longtext",
  "email",
  "phone",
  "date",
  "number",
  "choice",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const SOURCE_TYPES = ["url", "pdf", "image"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const EXTRACTION_MODES = ["html", "text", "ocr", "demo"] as const;
export type ExtractionMode = (typeof EXTRACTION_MODES)[number];

export type FormFieldDto = {
  key: string;
  question: string;
  plainQuestion: string;
  label?: string;
  type: FieldType;
  required: boolean;
  helpText?: string;
  options?: string[];
  maxLength?: number;
  step?: number;
  stepTitle?: string;
};

export type FormSummaryDto = {
  id: string;
  title: string;
  sourceType: SourceType;
  sourceLabel: string;
  fieldCount: number;
  answeredCount: number;
  createdAt: string;
  extractionMode: ExtractionMode;
  demoFallback: boolean;
  aiEnhanced: boolean;
};

export type FormDetailDto = FormSummaryDto & {
  fields: FormFieldDto[];
  answers: Record<string, string>;
  suggestedAnswers?: Record<string, string>;
  aiInstructions?: string;
  extractionNote?: string;
};

export const MAX_FORM_FIELDS = 30;
export const MAX_ANSWER_LENGTH = 2000;
