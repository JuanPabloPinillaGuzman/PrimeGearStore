import { InMemoryRateLimitStore } from "@/lib/rate-limit/providers/memory";
import { RedisRateLimitStorePlaceholder } from "@/lib/rate-limit/providers/redis-placeholder";
import type { RateLimitDecision, RateLimitStore } from "@/lib/rate-limit/types";

type RateLimitConfig = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

let cachedStore: RateLimitStore | null = null;

function getStore() {
  if (cachedStore) return cachedStore;
  const provider = (process.env.RATE_LIMIT_PROVIDER ?? "memory").toLowerCase();
  cachedStore =
    provider === "redis" ? new RedisRateLimitStorePlaceholder() : new InMemoryRateLimitStore();
  return cachedStore;
}

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return headers.get("x-real-ip") ?? "unknown";
}

export function resolveStoreApiRateLimit(pathname: string): RateLimitConfig | null {
  if (!pathname.startsWith("/api/store/")) return null;

  const defaultWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const defaultLimit = Number(process.env.RATE_LIMIT_STORE_LIMIT ?? 120);

  if (pathname.startsWith("/api/store/payments/")) {
    return {
      keyPrefix: "store:payments",
      limit: Number(process.env.RATE_LIMIT_PAYMENTS_LIMIT ?? 30),
      windowMs: defaultWindowMs,
    };
  }

  if (pathname.startsWith("/api/store/checkout")) {
    return {
      keyPrefix: "store:checkout",
      limit: Number(process.env.RATE_LIMIT_CHECKOUT_LIMIT ?? 20),
      windowMs: defaultWindowMs,
    };
  }

  if (pathname.startsWith("/api/store/cart/")) {
    return {
      keyPrefix: "store:cart",
      limit: Number(process.env.RATE_LIMIT_CART_LIMIT ?? 60),
      windowMs: defaultWindowMs,
    };
  }

  if (pathname.startsWith("/api/store/orders/")) {
    return {
      keyPrefix: "store:orders",
      limit: Number(process.env.RATE_LIMIT_ORDERS_LIMIT ?? 60),
      windowMs: defaultWindowMs,
    };
  }

  if (pathname.startsWith("/api/store/catalog")) {
    return {
      keyPrefix: "store:catalog",
      limit: Number(process.env.RATE_LIMIT_CATALOG_LIMIT ?? defaultLimit),
      windowMs: defaultWindowMs,
    };
  }

  return {
    keyPrefix: "store:default",
    limit: defaultLimit,
    windowMs: defaultWindowMs,
  };
}

export async function consumeRateLimit(params: {
  pathname: string;
  headers: Headers;
}): Promise<RateLimitDecision | null> {
  const config = resolveStoreApiRateLimit(params.pathname);
  if (!config) return null;

  const ip = getClientIp(params.headers);
  const key = `${config.keyPrefix}:${ip}`;
  return getStore().consume(key, config.limit, config.windowMs);
}

