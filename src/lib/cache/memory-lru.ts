import { logEvent } from "@/lib/security/log";

export interface CacheStore<T> {
  get(key: string): T | undefined;
  set(key: string, value: T, ttlMs?: number): void;
  delete(key: string): void;
  clear(): void;
}

type Entry<T> = {
  value: T;
  expiresAt: number;
};

export class MemoryLruCache<T> implements CacheStore<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly name: string;
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(name: string, maxEntries: number, defaultTtlMs: number) {
    this.name = name;
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      logEvent("cache.miss", { cache: this.name });
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      logEvent("cache.miss", { cache: this.name, reason: "expired" });
      return undefined;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    logEvent("cache.hit", { cache: this.name });
    return entry.value;
  }

  set(key: string, value: T, ttlMs = this.defaultTtlMs): void {
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) this.entries.delete(oldestKey);
    }

    this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1000, ttlMs),
    });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
