type CacheEntry<T> = {
  data: T;
  ts: number;
};

const PRODUCT_DETAIL_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry<unknown>>();

export function getCachedProductDetail<T>(slug: string) {
  const entry = cache.get(slug);
  if (!entry) return null;
  if (Date.now() - entry.ts > PRODUCT_DETAIL_TTL_MS) {
    cache.delete(slug);
    return null;
  }
  return entry.data as T;
}

export function setCachedProductDetail<T>(slug: string, data: T) {
  cache.set(slug, { data, ts: Date.now() });
}

