export type CatalogFiltersQuery = {
  search?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: string;
  page?: number;
};

export function parsePositivePage(value: string | null | undefined, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function parseCatalogFiltersFromSearchParams(searchParams: URLSearchParams): CatalogFiltersQuery {
  return {
    search: searchParams.get("search")?.trim() || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    minPrice: searchParams.get("minPrice") || undefined,
    maxPrice: searchParams.get("maxPrice") || undefined,
    inStock: searchParams.get("inStock") === "1" ? true : undefined,
    sort: searchParams.get("sort") || "RELEVANCE",
    page: parsePositivePage(searchParams.get("page"), 1),
  };
}

