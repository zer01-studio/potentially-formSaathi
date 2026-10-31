import { MemoryLruCache } from "@/lib/cache/memory-lru";
import type { CachedExtraction } from "./results";

export const extractionCache = new MemoryLruCache<CachedExtraction>(
  "extraction",
  100,
  60 * 60 * 1000,
);
