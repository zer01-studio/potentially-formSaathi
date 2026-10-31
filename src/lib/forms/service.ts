import "server-only";
import { Types } from "mongoose";
import { ApiHttpError } from "@/lib/api/errors";
import {
  getPrefillSuggestions,
  saveContextFromAnswer,
} from "@/lib/context/service";
import { connectDb } from "@/lib/db/connect";
import { Answer } from "@/lib/db/models/answer";
import { Form } from "@/lib/db/models/form";
import { validateAnswerValue } from "./answer-validation";
import { toFormDetail, toFormSummary, type FormRecordLike } from "./mappers";
import type { FormDetailDto, FormFieldDto, FormSummaryDto } from "./types";

function userObjectId(userId: string): Types.ObjectId {
  return new Types.ObjectId(userId);
}

function formObjectId(formId: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(formId)) {
    throw formNotFound();
  }
  return new Types.ObjectId(formId);
}

function formNotFound(): ApiHttpError {
  return new ApiHttpError(404, "not_found", "We couldn’t find that form.");
}

export async function listFormsForUser(
  userId: string,
  limit = 20,
): Promise<FormSummaryDto[]> {
  await connectDb();

  const forms = await Form.find({
    userId: userObjectId(userId),
    hiddenAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 50))
    .lean();

  if (forms.length === 0) return [];

  const counts = await Answer.aggregate<{ _id: Types.ObjectId; count: number }>([
    {
      $match: {
        userId: userObjectId(userId),
        formId: { $in: forms.map((form) => form._id) },
      },
    },
    { $group: { _id: "$formId", count: { $sum: 1 } } },
  ]);

  const countsByForm = new Map(
    counts.map((entry) => [String(entry._id), entry.count]),
  );

  return forms.map((form) =>
    toFormSummary(
      form as unknown as FormRecordLike,
      countsByForm.get(String(form._id)) ?? 0,
    ),
  );
}

export async function getFormDetailForUser(
  userId: string,
  formId: string,
): Promise<FormDetailDto> {
  await connectDb();

  const form = await Form.findOne({
    _id: formObjectId(formId),
    userId: userObjectId(userId),
    hiddenAt: null,
  }).lean();

  if (!form) throw formNotFound();

  const answers = await Answer.find({
    userId: userObjectId(userId),
    formId: form._id,
  }).lean();

  const suggestedAnswers = await getPrefillSuggestions(
    userId,
    form.fields as unknown as FormFieldDto[],
  );

  return toFormDetail(
    form as unknown as FormRecordLike,
    answers,
    suggestedAnswers,
  );
}

export async function saveAnswerForUser(options: {
  userId: string;
  formId: string;
  fieldKey: string;
  value: string;
}): Promise<{ fieldKey: string; value: string; updatedAt: string | null }> {
  const { userId, fieldKey, value } = options;
  await connectDb();

  const form = await Form.findOne({
    _id: formObjectId(options.formId),
    userId: userObjectId(userId),
    hiddenAt: null,
  }).lean();

  if (!form) throw formNotFound();

  const fields = form.fields as unknown as FormFieldDto[];
  const field = fields.find((candidate) => candidate.key === fieldKey);

  if (!field) {
    throw new ApiHttpError(
      400,
      "unknown_field",
      "That question isn’t part of this form.",
    );
  }

  const validation = validateAnswerValue(field, value);
  if (!validation.ok) {
    throw new ApiHttpError(400, "validation_failed", validation.message, {
      fieldErrors: { [fieldKey]: validation.message },
    });
  }

  if (!validation.normalizedValue) {
    await Answer.deleteOne({
      userId: userObjectId(userId),
      formId: form._id,
      fieldKey,
    });
    return { fieldKey, value: "", updatedAt: null };
  }

  const updated = await Answer.findOneAndUpdate(
    {
      userId: userObjectId(userId),
      formId: form._id,
      fieldKey,
    },
    { $set: { value: validation.normalizedValue, updatedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  await saveContextFromAnswer({
    userId,
    formId: String(form._id),
    field,
    value: validation.normalizedValue,
  });

  return {
    fieldKey,
    value: validation.normalizedValue,
    updatedAt: (updated?.updatedAt ?? new Date()).toISOString(),
  };
}

function exportFileName(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${base || "formsaathi-form"}-answers.json`;
}

export async function buildFormExport(
  userId: string,
  formId: string,
): Promise<{ payload: Record<string, unknown>; fileName: string }> {
  const detail = await getFormDetailForUser(userId, formId);
  const problems: Array<{ key: string; question: string; message: string }> = [];

  for (const field of detail.fields) {
    const value = detail.answers[field.key] ?? "";
    if (!value && !field.required) continue;

    const validation = validateAnswerValue(field, value);
    if (!validation.ok) {
      problems.push({
        key: field.key,
        question: field.plainQuestion,
        message: validation.message,
      });
    }
  }

  if (problems.length > 0) {
    throw new ApiHttpError(
      409,
      "form_incomplete",
      "A few answers still need attention before we can generate the form.",
      { questions: problems },
    );
  }

  const payload = {
    apiVersion: "v1",
    generatedAt: new Date().toISOString(),
    form: {
      id: detail.id,
      title: detail.title,
      sourceType: detail.sourceType,
      sourceLabel: detail.sourceLabel,
      createdAt: detail.createdAt,
    },
    answers: detail.fields.map((field) => ({
      key: field.key,
      question: field.question,
      plainQuestion: field.plainQuestion,
      type: field.type,
      value: detail.answers[field.key] ?? null,
    })),
  };

  return { payload, fileName: exportFileName(detail.title) };
}
