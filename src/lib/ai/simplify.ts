import "server-only";
import { env, services } from "@/lib/env";
import { cleanText, maxLengthFor } from "@/lib/forms/field-rules";
import type { FormFieldDto } from "@/lib/forms/types";
import { logEvent, logWarn } from "@/lib/security/log";
import { consumeAiBudget } from "./budget";
import { aiFormPlanCache, formPlanCacheKey } from "./cache";
import {
  GemmaError,
  generateFormPlan,
  isAllowedTypeChange,
  type FormPlanItem,
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

const MAX_FIELDS_PER_STEP = 4;

function applySuggestion(
  field: FormFieldDto,
  suggestion: FormPlanItem | undefined,
): FormFieldDto {
  if (!suggestion) return field;

  let type = field.type;
  if (isAllowedTypeChange(suggestion.type, field.type, Boolean(field.options?.length))) {
    type = suggestion.type;
  }

  const plainQuestion =
    cleanText(suggestion.plainQuestion, 220) || field.plainQuestion;
  const label = suggestion.label ? cleanText(suggestion.label, 60) : "";
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
    ...(label ? { label } : {}),
    type,
    ...(helpText ? { helpText } : {}),
    ...(typeof maxLength === "number" ? { maxLength } : {}),
  };
}

type PlannedField = {
  index: number;
  field: FormFieldDto;
  suggestion?: FormPlanItem;
};

function groupPlannedFields(planned: PlannedField[]): FormFieldDto[] {
  const everyFieldHasStep = planned.every(
    (entry) =>
      typeof entry.suggestion?.step === "number" &&
      entry.suggestion.step >= 0,
  );

  if (!everyFieldHasStep) {
    return planned.map((entry) => entry.field);
  }

  const groups = new Map<number, PlannedField[]>();
  for (const entry of planned) {
    const step = entry.suggestion!.step!;
    const list = groups.get(step) ?? [];
    list.push(entry);
    groups.set(step, list);
  }

  const ordered = [...groups.values()].sort(
    (a, b) => a[0].index - b[0].index,
  );

  const finalGroups: PlannedField[][] = [];
  for (const group of ordered) {
    for (let start = 0; start < group.length; start += MAX_FIELDS_PER_STEP) {
      finalGroups.push(group.slice(start, start + MAX_FIELDS_PER_STEP));
    }
  }

  const fields: FormFieldDto[] = [];
  finalGroups.forEach((group, stepIndex) => {
    const multi = group.length > 1;
    const rawTitle = multi
      ? cleanText(group[0].suggestion?.stepTitle ?? "", 80)
      : "";
    const stepTitle = multi
      ? rawTitle || "A few details"
      : group[0].field.plainQuestion;

    for (const entry of group) {
      fields.push({
        ...entry.field,
        step: stepIndex,
        stepTitle,
        ...(multi
          ? {
              label:
                entry.field.label ??
                cleanText(entry.field.plainQuestion, 60),
            }
          : {}),
      });
    }
  });

  return fields.sort((a, b) => {
    const indexA = planned.find((entry) => entry.field.key === a.key)?.index ?? 0;
    const indexB = planned.find((entry) => entry.field.key === b.key)?.index ?? 0;
    return indexA - indexB;
  });
}

function applyPlan(
  fields: FormFieldDto[],
  items: FormPlanItem[],
): FormFieldDto[] {
  const suggestions = new Map(items.map((item) => [item.id, item]));
  const planned = fields.map((field, index) => ({
    index,
    field: applySuggestion(field, suggestions.get(index)),
    suggestion: suggestions.get(index),
  }));

  return groupPlannedFields(planned);
}

function countSteps(fields: FormFieldDto[]): number {
  return new Set(
    fields.map((field) =>
      typeof field.step === "number" ? `step:${field.step}` : `field:${field.key}`,
    ),
  ).size;
}

export async function simplifyFieldsWithGemma(input: {
  userId: string;
  title: string;
  fields: FormFieldDto[];
  instructions?: string;
}): Promise<SimplifyOutcome> {
  if (!services.gemma || input.fields.length === 0) {
    return { fields: input.fields, usedAi: false };
  }

  const batch = input.fields.slice(0, MAX_AI_FIELDS_PER_CALL);
  const promptItems = batch.map((field) => fieldForPrompt(field));
  const items = promptItems.map((item, id) => ({ id, ...item }));
  const cacheKey = formPlanCacheKey({
    model: env.GEMMA_MODEL,
    promptVersion: SIMPLIFY_PROMPT_VERSION,
    title: input.title,
    items: promptItems,
    instructions: input.instructions,
  });

  const cached = aiFormPlanCache.get(cacheKey);
  if (cached) {
    logEvent("ai.plan_cached", { fields: batch.length });
    return { fields: applyPlan(input.fields, cached), usedAi: true };
  }

  if (!consumeAiBudget(input.userId, env.DAILY_AI_BUDGET_PER_USER)) {
    logWarn("ai.plan_skipped", { reason: "budget" });
    return { fields: input.fields, usedAi: false };
  }

  try {
    const results = await generateFormPlan(
      buildSimplifyPrompt(input.title, items, input.instructions),
    );

    const unique = new Map<number, FormPlanItem>();
    for (const result of results) {
      if (result.id < 0 || result.id >= batch.length) continue;
      if (!unique.has(result.id)) unique.set(result.id, result);
    }

    if (unique.size === 0) {
      throw new GemmaError("invalid_output", "No usable ids.");
    }

    const plan = [...unique.values()].sort((a, b) => a.id - b.id);
    aiFormPlanCache.set(cacheKey, plan);
    const plannedFields = applyPlan(input.fields, plan);

    logEvent("ai.plan_applied", {
      requested: batch.length,
      returned: plan.length,
      steps: countSteps(plannedFields),
    });

    return { fields: plannedFields, usedAi: true };
  } catch (error) {
    logWarn("ai.plan_failed", {
      error: error instanceof Error ? error.name : "unknown",
      code: error instanceof GemmaError ? error.code : "unknown",
    });
    return { fields: input.fields, usedAi: false };
  }
}
