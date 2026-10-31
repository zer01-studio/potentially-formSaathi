import "server-only";
import { env, services } from "@/lib/env";
import { cleanText, maxLengthFor } from "@/lib/forms/field-rules";
import type { FormFieldDto } from "@/lib/forms/types";
import { logEvent, logWarn } from "@/lib/security/log";
import { consumeAiBudget } from "./budget";
import {
  aiSimplificationCache,
  simplificationCacheKey,
} from "./cache";
import {
  GemmaError,
  generateSimplifications,
  isAllowedTypeChange,
  type SimplificationItem,
} from "./gemma";
import {
  SIMPLIFY_PROMPT_VERSION,
  buildSimplifyPrompt,
  fieldForPrompt,
  MAX_AI_FIELDS_PER_CALL,
} from "./prompts";

export type SimplifyOutcome = {
  fields: FormFieldDto[];
  usedAi: boolean;
};

function applySuggestion(
  field: FormFieldDto,
  suggestion: SimplificationItem | undefined,
): FormFieldDto {
  if (!suggestion) return field;

  let type = field.type;
  if (isAllowedTypeChange(suggestion.type, field.type, Boolean(field.options?.length))) {
    type = suggestion.type;
  }

  const plainQuestion =
    cleanText(suggestion.plainQuestion, 220) || field.plainQuestion;
  const helpText = suggestion.helpText
    ? cleanText(suggestion.helpText, 160)
    : field.helpText;

  const maxLength =
    type === field.type
      ? field.maxLength
      : Math.min(field.maxLength ?? maxLengthFor(type), maxLengthFor(type));

  return {
    ...field,
    plainQuestion,
    type,
    ...(helpText ? { helpText } : {}),
    ...(typeof maxLength === "number" ? { maxLength } : {}),
    required: suggestion.required ?? field.required,
  };
}

export async function simplifyFieldsWithGemma(input: {
  userId: string;
  title: string;
  fields: FormFieldDto[];
}): Promise<SimplifyOutcome> {
  if (!services.gemma || input.fields.length === 0) {
    return { fields: input.fields, usedAi: false };
  }

  const keyFor = (field: FormFieldDto) =>
    simplificationCacheKey(env.GEMMA_MODEL, SIMPLIFY_PROMPT_VERSION, field.question);

  const suggestions = new Map<number, SimplificationItem>();
  const missing: Array<{ id: number; field: FormFieldDto }> = [];

  input.fields.forEach((field, id) => {
    const cached = aiSimplificationCache.get(keyFor(field));
    if (cached) {
      suggestions.set(id, cached);
    } else {
      missing.push({ id, field });
    }
  });

  let usedAi = suggestions.size > 0;

  if (missing.length > 0) {
    if (!consumeAiBudget(input.userId, env.DAILY_AI_BUDGET_PER_USER)) {
      logWarn("ai.simplify_skipped", { reason: "budget" });
      return { fields: input.fields, usedAi };
    }

    const batch = missing.slice(0, MAX_AI_FIELDS_PER_CALL);

    try {
      const items = batch.map(({ id, field }) => ({
        id,
        ...fieldForPrompt(field),
      }));
      const results = await generateSimplifications(
        buildSimplifyPrompt(input.title, items),
      );
      const validIds = new Set(items.map((item) => item.id));

      for (const result of results) {
        if (!validIds.has(result.id)) continue;
        const entry = batch.find((item) => item.id === result.id);
        if (!entry) continue;

        aiSimplificationCache.set(keyFor(entry.field), result);
        suggestions.set(result.id, result);
        usedAi = true;
      }

      logEvent("ai.simplify_applied", {
        requested: items.length,
        returned: results.length,
        cached: input.fields.length - missing.length,
      });
    } catch (error) {
      logWarn("ai.simplify_failed", {
        error: error instanceof Error ? error.name : "unknown",
        code: error instanceof GemmaError ? error.code : "unknown",
      });
    }
  }

  return {
    fields: input.fields.map((field, id) => applySuggestion(field, suggestions.get(id))),
    usedAi,
  };
}
