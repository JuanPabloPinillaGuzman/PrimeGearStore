export type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
};

export interface RateLimitStore {
  consume(key: string, limit: number, windowMs: number): Promise<RateLimitDecision>;
}

