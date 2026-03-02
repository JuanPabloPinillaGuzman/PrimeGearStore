import type { RateLimitDecision, RateLimitStore } from "@/lib/rate-limit/types";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export class InMemoryRateLimitStore implements RateLimitStore {
  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const next: Bucket = {
        count: 1,
        resetAt: now + windowMs,
      };
      buckets.set(key, next);
      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - 1),
        resetAt: next.resetAt,
      };
    }

    existing.count += 1;
    return {
      allowed: existing.count <= limit,
      limit,
      remaining: Math.max(0, limit - existing.count),
      resetAt: existing.resetAt,
    };
  }
}

