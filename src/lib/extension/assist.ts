import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { consumeAiBudget } from "@/lib/ai/budget";
import {
  GemmaError,
  extractJsonObject,
  requestGenerationWithRetry,
} from "@/lib/ai/gemma";
import { MemoryLruCache } from "@/lib/cache/memory-lru";
import { env, services } from "@/lib/env";
import { logEvent, logWarn } from "@/lib/security/log";
import { matchFieldsWithRules } from "./match";
import { ASSIST_PROMPT_VERSION, buildAssistPrompt } from "./prompts";
import {
  CONFIDENCE_LEVELS,
  statusForConfidence,
  type AssistRequest,
  type AssistResponse,
  type Candidate,
  type FieldMatch,
} from "./types";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const assistCache = new MemoryLruCache<FieldMatch[]>(
  "extension-assist",
  200,
  CACHE_TTL_MS,
);

const modelMatchSchema = z.strictObject({
  fieldId: z.string().min(1).max(80),
  candidateKey: z.string().max(80).nullable(),
  confidence: z.enum(CONFIDENCE_LEVELS),
  reason: z.string().max(240).default(""),
  question: z.string().max(240).nullable().default(null),
  guidance: z.string().max(240).nullable().default(null),
});

const modelResponseSchema = z.strictObject({
  matches: z.array(modelMatchSchema).min(1).max(40),
});

type ModelMatch = z.infer<typeof modelMatchSchema>;

function cacheKeyFor(request: AssistRequest): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        model: env.GEMMA_MODEL,
        prompt: ASSIST_PROMPT_VERSION,
        host: request.page.url,
        fields: request.page.fields,
        candidates: request.candidates.map((candidate) => ({
          key: candidate.key,
          label: candidate.label,
          type: candidate.type ?? null,
        })),
      }),
    )
    .digest("hex");
}

function mergeWithRules(
  rules: FieldMatch[],
  modelMatches: ModelMatch[],
  candidates: Candidate[],
): FieldMatch[] {
  const candidatesByKey = new Map(candidates.map((candidate) => [candidate.key, candidate]));
  const byField = new Map(modelMatches.map((match) => [match.fieldId, match]));

  return rules.map((rule) => {
    const model = byField.get(rule.fieldId);
    if (!model) return rule;

    const candidate = model.candidateKey
      ? candidatesByKey.get(model.candidateKey)
      : undefined;
    // A model may only reference supplied keys; anything else is discarded.
    const candidateKey = candidate ? candidate.key : null;
    const confidence = candidate ? model.confidence : "low";

    return {
      fieldId: rule.fieldId,
      candidateKey,
      value: candidate && confidence !== "low" ? candidate.value : null,
      confidence,
      status: statusForConfidence(candidateKey, confidence),
      reason: model.reason.trim() || rule.reason,
      question:
        candidateKey === null
          ? model.question?.trim() || rule.question
          : null,
      guidance: model.guidance?.trim() || rule.guidance,
    };
  });
}

export async function assistFields(input: {
  userId: string;
  request: AssistRequest;
}): Promise<AssistResponse> {
  const { request } = input;
  const rules = matchFieldsWithRules(request.page.fields, request.candidates);

  if (request.page.fields.length === 0) {
    return { mode: "rules", matches: [], notes: ["No fillable fields were found on this page."] };
  }

  if (request.candidates.length === 0) {
    return {
      mode: "rules",
      matches: rules,
      notes: ["No saved answers were provided, so questions come from the page labels."],
    };
  }

  if (!services.gemma) {
    return {
      mode: "rules",
      matches: rules,
      notes: ["Gemma isn't configured, so fields were matched with local rules."],
    };
  }

  const cacheKey = cacheKeyFor(request);
  const cached = assistCache.get(cacheKey);
  if (cached) {
    logEvent("ai.assist_cached", { fields: request.page.fields.length });
    return { mode: "ai", matches: cached, notes: [] };
  }

  if (!consumeAiBudget(input.userId, env.DAILY_AI_BUDGET_PER_USER)) {
    logWarn("ai.assist_skipped", { reason: "budget" });
    return {
      mode: "rules",
      matches: rules,
      notes: ["The daily AI budget is used up, so local matching was used."],
    };
  }

  try {
    const text = await requestGenerationWithRetry(
      buildAssistPrompt({
        pageTitle: request.page.title,
        pageHost: new URL(request.page.url || "https://unknown.invalid").host,
        fields: request.page.fields,
        candidates: request.candidates,
      }),
    );

    const parsed = modelResponseSchema.parse(extractJsonObject(text));
    const merged = mergeWithRules(rules, parsed.matches, request.candidates);

    assistCache.set(cacheKey, merged);
    logEvent("ai.assist_applied", {
      fields: request.page.fields.length,
      returned: parsed.matches.length,
      confident: merged.filter((match) => match.status === "matched").length,
    });

    return { mode: "ai", matches: merged, notes: [] };
  } catch (error) {
    logWarn("ai.assist_failed", {
      error: error instanceof Error ? error.name : "unknown",
      code: error instanceof GemmaError ? error.code : "unknown",
      detail:
        error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });
    return {
      mode: "rules",
      matches: rules,
      notes: ["The AI service couldn't be reached, so local matching was used."],
    };
  }
}
