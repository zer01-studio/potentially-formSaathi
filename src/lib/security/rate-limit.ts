export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type WindowBucket = number[];

/**
 * In-memory sliding-window limiter. Keys must already be opaque (hashed)
 * so no personal data is retained. Swap the implementation for Redis later
 * without touching call sites.
 */
export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, WindowBucket>();
  private readonly maxKeys: number;

  constructor(maxKeys = 10_000) {
    this.maxKeys = maxKeys;
  }

  consume(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const windowStart = now - windowMs;

    let hits = this.buckets.get(key);
    if (!hits) {
      if (this.buckets.size >= this.maxKeys) {
        const oldestKey = this.buckets.keys().next().value;
        if (oldestKey !== undefined) this.buckets.delete(oldestKey);
      }
      hits = [];
    }

    while (hits.length > 0 && hits[0] <= windowStart) {
      hits.shift();
    }

    if (hits.length >= limit) {
      this.buckets.set(key, hits);
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((hits[0] + windowMs - now) / 1000),
      );
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    hits.push(now);
    this.buckets.set(key, hits);
    return {
      allowed: true,
      remaining: Math.max(0, limit - hits.length),
      retryAfterSeconds: 0,
    };
  }

  reset() {
    this.buckets.clear();
  }
}

export const rateLimiter = new SlidingWindowRateLimiter();
