import { createHash } from "node:crypto";
import { MemoryLruCache } from "@/lib/cache/memory-lru";
import type { SimplificationItem } from "./gemma";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const aiSimplificationCache = new MemoryLruCache<SimplificationItem>(
  "gemma-simplify",
  500,
  CACHE_TTL_MS,
);

export function normalizeQuestionForCache(question: string): string {
  return question
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?:.。]+$/g, "")
    .trim();
}

export function simplificationCacheKey(
  model: string,
  promptVersion: string,
  question: string,
): string {
  return createHash("sha256")
    .update(`${model}|${promptVersion}|${normalizeQuestionForCache(question)}`)
    .digest("hex");
}
