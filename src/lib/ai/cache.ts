import { createHash } from "node:crypto";
import { MemoryLruCache } from "@/lib/cache/memory-lru";
import type { FormPlanItem } from "./gemma";
import type { SimplifyPromptItem } from "./prompts";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * The plan groups fields, so the key covers the entire form rather than a
 * single question. Identical forms still reuse a cached plan.
 */
export const aiFormPlanCache = new MemoryLruCache<FormPlanItem[]>(
  "gemma-form-plan",
  200,
  CACHE_TTL_MS,
);

export function formPlanCacheKey(input: {
  model: string;
  promptVersion: string;
  title: string;
  items: Array<Omit<SimplifyPromptItem, "id">>;
  instructions?: string;
}): string {
  const notes = input.instructions?.trim().toLowerCase() ?? "";
  return createHash("sha256")
    .update(
      JSON.stringify({
        model: input.model,
        prompt: input.promptVersion,
        title: input.title.trim().toLowerCase(),
        notes,
        items: input.items,
      }),
    )
    .digest("hex");
}
