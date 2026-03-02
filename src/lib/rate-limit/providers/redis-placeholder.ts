import type { RateLimitDecision, RateLimitStore } from "@/lib/rate-limit/types";

export class RedisRateLimitStorePlaceholder implements RateLimitStore {
  async consume(_key: string, limit: number, windowMs: number): Promise<RateLimitDecision> {
    // TODO(sprint-10): Replace with Redis-backed implementation in production.
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetAt: Date.now() + windowMs,
    };
  }
}

