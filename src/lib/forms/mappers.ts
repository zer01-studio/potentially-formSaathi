import type {
  ExtractionMode,
  FieldType,
  FormDetailDto,
  FormFieldDto,
  FormSummaryDto,
  SourceType,
} from "./types";

type FormFieldLike = {
  key: string;
  question: string;
  plainQuestion: string;
  type: string;
  required?: boolean | null;
  helpText?: string | null;
  options?: string[] | null;
  maxLength?: number | null;
};

export type FormRecordLike = {
  _id: unknown;
  title: string;
  sourceType: string;
  sourceLabel: string;
  fields: FormFieldLike[];
  createdAt?: Date | null;
  extractionMode: string;
  demoFallback?: boolean | null;
  extractionNote?: string | null;
};

type AnswerLike = {
  fieldKey: string;
  value: string;
};

function toFields(fields: FormFieldLike[]): FormFieldDto[] {
  return fields.map((field) => ({
    key: field.key,
    question: field.question,
    plainQuestion: field.plainQuestion,
    type: field.type as FieldType,
    required: Boolean(field.required),
    ...(field.helpText ? { helpText: field.helpText } : {}),
    ...(field.options && field.options.length > 0
      ? { options: [...field.options] }
      : {}),
    ...(typeof field.maxLength === "number" ? { maxLength: field.maxLength } : {}),
  }));
}

export function toFormSummary(
  form: FormRecordLike,
  answeredCount: number,
): FormSummaryDto {
  return {
    id: String(form._id),
    title: form.title,
    sourceType: form.sourceType as SourceType,
    sourceLabel: form.sourceLabel,
    fieldCount: form.fields.length,
    answeredCount,
    createdAt: (form.createdAt ?? new Date()).toISOString(),
    extractionMode: form.extractionMode as ExtractionMode,
    demoFallback: Boolean(form.demoFallback),
  };
}

export function toFormDetail(
  form: FormRecordLike,
  answers: AnswerLike[],
): FormDetailDto {
  const fields = toFields(form.fields);
  const knownKeys = new Set(fields.map((field) => field.key));
  const answerMap: Record<string, string> = {};
  let answeredCount = 0;

  for (const answer of answers) {
    if (!knownKeys.has(answer.fieldKey) || !answer.value) continue;
    answerMap[answer.fieldKey] = answer.value;
    answeredCount += 1;
  }

  return {
    ...toFormSummary(form, answeredCount),
    fields,
    answers: answerMap,
    ...(form.extractionNote ? { extractionNote: form.extractionNote } : {}),
  };
}
