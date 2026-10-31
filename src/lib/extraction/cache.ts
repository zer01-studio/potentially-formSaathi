import { MemoryLruCache } from "@/lib/cache/memory-lru";
import type { CachedExtraction } from "./results";

export const EXTRACTION_CACHE_VERSION = "extraction-v4";

export function extractionCacheKey(contentHash: string): string {
  return `${EXTRACTION_CACHE_VERSION}:${contentHash}`;
}

export const extractionCache = new MemoryLruCache<CachedExtraction>(
  "extraction",
  100,
  60 * 60 * 1000,
);
