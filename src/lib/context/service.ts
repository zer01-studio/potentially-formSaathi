import "server-only";
import { Types } from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { ContextItem } from "@/lib/db/models/context-item";
import { User } from "@/lib/db/models/user";
import type { FormFieldDto } from "@/lib/forms/types";
import { logWarn } from "@/lib/security/log";
import { contextDescriptorForField } from "./keys";
import type {
  ContextCategory,
  ContextItemDto,
  ContextListResponse,
} from "./types";

type ContextItemLike = {
  _id: unknown;
  category: string;
  label: string;
  value: string;
  key?: string | null;
  autofillKey?: string | null;
  source?: string | null;
  sourceFormId?: unknown;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

function toDto(item: ContextItemLike): ContextItemDto {
  return {
    id: String(item._id),
    category: item.category as ContextCategory,
    label: item.label,
    value: item.value,
    key: item.key ?? null,
    autofillKey: item.autofillKey ?? null,
    source: item.source === "form_answer" ? "form_answer" : "manual",
    ...(item.sourceFormId ? { sourceFormId: String(item.sourceFormId) } : {}),
    createdAt: (item.createdAt ?? new Date()).toISOString(),
    updatedAt: (item.updatedAt ?? new Date()).toISOString(),
  };
}

function objectId(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

export async function isContextSavingEnabled(userId: string): Promise<boolean> {
  await connectDb();
  const user = await User.findById(objectId(userId))
    .select("contextSavingEnabled")
    .lean();
  return user?.contextSavingEnabled !== false;
}

export async function listContextItems(
  userId: string,
): Promise<ContextListResponse> {
  await connectDb();
  const [items, user] = await Promise.all([
    ContextItem.find({ userId: objectId(userId) })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean(),
    User.findById(objectId(userId)).select("contextSavingEnabled").lean(),
  ]);

  return {
    items: items.map((item) => toDto(item as ContextItemLike)),
    savingEnabled: user?.contextSavingEnabled !== false,
  };
}

export async function createContextItem(input: {
  userId: string;
  category: ContextCategory;
  label: string;
  value: string;
  autofillKey?: string | null;
}): Promise<ContextItemDto> {
  await connectDb();
  const autofillKey = input.autofillKey?.trim() || null;
  const created = await ContextItem.create({
    userId: objectId(input.userId),
    category: input.category,
    label: input.label,
    value: input.value,
    key: autofillKey,
    autofillKey,
    source: "manual",
    updatedAt: new Date(),
  });

  return toDto(created.toObject() as ContextItemLike);
}

export async function updateContextItem(input: {
  userId: string;
  itemId: string;
  category?: ContextCategory;
  label?: string;
  value?: string;
  autofillKey?: string | null;
}): Promise<ContextItemDto | null> {
  await connectDb();
  const existing = await ContextItem.findOne({
    _id: objectId(input.itemId),
    userId: objectId(input.userId),
  }).lean();
  if (!existing) return null;

  const $set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.category !== undefined) $set.category = input.category;
  if (input.label !== undefined) $set.label = input.label;
  if (input.value !== undefined) $set.value = input.value;
  if (input.autofillKey !== undefined) {
    const autofillKey = input.autofillKey?.trim() || null;
    $set.autofillKey = autofillKey;
    if (!existing.key && autofillKey) $set.key = autofillKey;
  }

  const updated = await ContextItem.findByIdAndUpdate(existing._id, { $set }, {
    new: true,
  }).lean();

  return updated ? toDto(updated as ContextItemLike) : null;
}

export async function deleteContextItem(input: {
  userId: string;
  itemId: string;
}): Promise<boolean> {
  await connectDb();
  const result = await ContextItem.deleteOne({
    _id: objectId(input.itemId),
    userId: objectId(input.userId),
  });
  return result.deletedCount > 0;
}

export async function clearContextItems(userId: string): Promise<number> {
  await connectDb();
  const result = await ContextItem.deleteMany({ userId: objectId(userId) });
  return result.deletedCount;
}

/**
 * Saves a reusable detail from an answer only when context saving is on and the
 * field maps to a safe autofill detail. Long free-text answers are ignored.
 */
export async function saveContextFromAnswer(input: {
  userId: string;
  formId: string;
  field: FormFieldDto;
  value: string;
}): Promise<void> {
  const value = input.value.trim();
  if (!value || value.length > 500) return;

  const descriptor = contextDescriptorForField(input.field);
  if (!descriptor) return;

  try {
    await connectDb();
    const user = await User.findById(objectId(input.userId))
      .select("contextSavingEnabled")
      .lean();
    if (user?.contextSavingEnabled === false) return;

    await ContextItem.findOneAndUpdate(
      {
        userId: objectId(input.userId),
        key: descriptor.key,
        source: "form_answer",
      },
      {
        $set: {
          category: descriptor.category,
          label: descriptor.label,
          value,
          sourceFormId: objectId(input.formId),
          updatedAt: new Date(),
        },
        $setOnInsert: { autofillKey: null },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    logWarn("context.answer_save_failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

export async function getPrefillSuggestions(
  userId: string,
  fields: FormFieldDto[],
): Promise<Record<string, string>> {
  await connectDb();
  const items = await ContextItem.find({
    userId: objectId(userId),
    value: { $ne: "" },
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  const byKey = new Map<string, string>();
  for (const item of items) {
    const key = item.key || item.autofillKey;
    if (key && !byKey.has(key)) {
      byKey.set(key, item.value);
    }
  }

  const suggestions: Record<string, string> = {};
  for (const field of fields) {
    const descriptor = contextDescriptorForField(field);
    if (!descriptor) continue;

    const value =
      byKey.get(descriptor.key) ??
      items.find((item) => item.autofillKey === descriptor.key)?.value;
    if (value) suggestions[field.key] = value;
  }

  return suggestions;
}

export async function getAutofillProfile(userId: string): Promise<{
  profile: Record<string, string>;
  count: number;
}> {
  await connectDb();
  const items = await ContextItem.find({
    userId: objectId(userId),
    autofillKey: { $nin: [null, ""] },
    value: { $ne: "" },
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  const profile: Record<string, string> = {};
  for (const item of items) {
    const key = item.autofillKey;
    if (!key || key in profile) continue;
    profile[key] = item.value;
  }

  return { profile, count: Object.keys(profile).length };
}
