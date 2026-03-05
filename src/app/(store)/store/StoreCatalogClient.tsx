"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CategoriesGrid } from "@/components/store/CategoriesGrid";
import { EmptyState } from "@/components/store/EmptyState";
import { FeaturedProducts } from "@/components/store/FeaturedProducts";
import { Hero } from "@/components/store/Hero";
import { Pagination } from "@/components/store/Pagination";
import { ProductCard } from "@/components/store/ProductCard";
import { PromoSection } from "@/components/store/PromoSection";
import { FiltersPanel } from "@/components/store/filters/FiltersPanel";
import { MobileFiltersSheet } from "@/components/store/filters/MobileFiltersSheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { parseCatalogFiltersFromSearchParams } from "@/lib/store/catalog-filters";

type CatalogItem = {
  id: number;
  sku: string | null;
  slug: string | null;
  name: string;
  category: { id: number; name: string } | null;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
  variants?: Array<{
    id: string;
    isInStock?: boolean;
  }>;
};

type CatalogResponse = {
  data: CatalogItem[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
};

type CategoriesResponse = {
  data: {
    items: Array<{
      id: number;
      name: string;
      activeProductsCount: number;
    }>;
  };
};

type FiltersState = {
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: boolean;
  sort?: string;
};

const PAGE_SIZE = 12;

function CatalogSkeletonGrid() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="Cargando catálogo"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <Skeleton className="h-52 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StoreCatalogClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ total: 0, limit: PAGE_SIZE, offset: 0 });
  const [categories, setCategories] = useState<CategoriesResponse["data"]["items"]>([]);

  const parsedQuery = useMemo(
    () => parseCatalogFiltersFromSearchParams(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const search = parsedQuery.search ?? "";
  const page = parsedQuery.page ?? 1;

  const filters = useMemo<FiltersState>(
    () => ({
      categoryId: parsedQuery.categoryId,
      minPrice: parsedQuery.minPrice,
      maxPrice: parsedQuery.maxPrice,
      inStock: parsedQuery.inStock,
      sort: parsedQuery.sort,
    }),
    [
      parsedQuery.categoryId,
      parsedQuery.inStock,
      parsedQuery.maxPrice,
      parsedQuery.minPrice,
      parsedQuery.sort,
    ],
  );

  // Detect if any filter/search is active — hide homepage sections when searching
  const hasActiveFilters = !!(
    search ||
    filters.categoryId ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.inStock ||
    (filters.sort && filters.sort !== "RELEVANCE")
  );

  const updateUrl = useCallback(
    (patch: Record<string, string | undefined | null>, options?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (options?.resetPage !== false) {
        next.delete("page");
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onFiltersChange = useCallback(
    (next: FiltersState) => {
      updateUrl({
        categoryId: next.categoryId,
        minPrice: next.minPrice,
        maxPrice: next.maxPrice,
        inStock: next.inStock ? "1" : undefined,
        sort: next.sort && next.sort !== "RELEVANCE" ? next.sort : undefined,
      });
    },
    [updateUrl],
  );

  const onResetFilters = useCallback(() => {
    updateUrl({
      categoryId: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      sort: undefined,
    });
  }, [updateUrl]);

  const onPageChange = useCallback(
    (nextPage: number) => {
      updateUrl({ page: String(nextPage) }, { resetPage: false });
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },
    [updateUrl],
  );

  const loadCatalog = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String((page - 1) * PAGE_SIZE),
          expand: "variants",
        });
        if (search) params.set("search", search);
        if (filters.categoryId) params.set("categoryId", filters.categoryId);
        if (filters.minPrice) params.set("minPrice", filters.minPrice);
        if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
        if (filters.inStock) params.set("inStock", "1");
        if (filters.sort && filters.sort !== "RELEVANCE") params.set("sort", filters.sort);

        const response = await fetch(`/api/store/catalog?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Failed to load catalog.");

        const payload = (await response.json()) as CatalogResponse;
        setItems(payload.data);
        setMeta(payload.meta);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError("No fue posible cargar el catálogo.");
        setItems([]);
        setMeta({ total: 0, limit: PAGE_SIZE, offset: 0 });
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [
    filters.categoryId,
    filters.inStock,
    filters.maxPrice,
    filters.minPrice,
    filters.sort,
    page,
    search,
  ]);

  useEffect(() => {
    return loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/store/categories", { cache: "no-store" });
        const payload = (await response.json()) as CategoriesResponse;
        if (!cancelled && response.ok) {
          setCategories(payload.data.items ?? []);
        }
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div aria-busy={loading} className="w-full">
      {/* ── Homepage sections (hidden when filtering/searching) ── */}
      {!hasActiveFilters && (
        <>
          <Hero />

          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <FeaturedProducts />
          </section>

          <CategoriesGrid />

          <section className="py-16">
            <PromoSection />
          </section>
        </>
      )}

      {/* ── Full catalog ── */}
      <section
        id="catalogo"
        className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-20 sm:px-6"
      >
        {/* Catalog header */}
        <div className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {hasActiveFilters ? "Resultados" : "Catálogo"}
            </p>
            <h2 className="font-display mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {search ? `"${search}"` : "Catálogo completo"}
            </h2>
            {!hasActiveFilters && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                Explora todos los productos disponibles con filtros avanzados.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="sm:hidden">
              <MobileFiltersSheet
                categories={categories}
                value={filters}
                onChange={onFiltersChange}
                onReset={onResetFilters}
              />
            </div>
            {hasActiveFilters && (
              <Button variant="outline" className="rounded-full" onClick={onResetFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Catalog grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <FiltersPanel
                categories={categories}
                value={filters}
                onChange={onFiltersChange}
                onReset={onResetFilters}
              />
            </div>
          </aside>

          <div className="space-y-5">
            {loading ? <CatalogSkeletonGrid /> : null}

            {!loading && error ? (
              <EmptyState
                title="No pudimos cargar el catálogo"
                description="Verifica tu conexión o intenta nuevamente."
                actionLabel="Reintentar"
                onAction={() => void loadCatalog()}
              />
            ) : null}

            {!loading && !error && items.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                description="No encontramos productos con esos filtros. Prueba ajustando categoría, precio o stock."
                actionLabel="Limpiar filtros"
                onAction={onResetFilters}
              />
            ) : null}

            {!loading && !error && items.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Mostrando {meta.offset + 1}–{Math.min(meta.offset + items.length, meta.total)} de{" "}
                  {meta.total} resultados
                </p>

                <section
                  aria-label="Listado de productos"
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {items.map((item) => (
                    <ProductCard key={item.id} product={item} />
                  ))}
                </section>

                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={meta.total}
                  onPageChange={onPageChange}
                />
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
