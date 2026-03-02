"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CategoriesGrid } from "@/components/store/CategoriesGrid";
import { EmptyState } from "@/components/store/EmptyState";
import { FeaturedProducts } from "@/components/store/FeaturedProducts";
import { Hero } from "@/components/store/Hero";
import { Pagination } from "@/components/store/Pagination";
import { ProductCard } from "@/components/store/ProductCard";
import { PromoStrip } from "@/components/store/PromoStrip";
import { StoreFooter } from "@/components/store/StoreFooter";
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
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
      aria-label="Cargando catalogo"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Skeleton className="h-52 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border/60 p-4">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
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
    [parsedQuery.categoryId, parsedQuery.inStock, parsedQuery.maxPrice, parsedQuery.minPrice, parsedQuery.sort],
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
        if (!response.ok) {
          throw new Error("Failed to load catalog.");
        }

        const payload = (await response.json()) as CatalogResponse;
        setItems(payload.data);
        setMeta(payload.meta);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setError("No fue posible cargar el catalogo.");
        setItems([]);
        setMeta({ total: 0, limit: PAGE_SIZE, offset: 0 });
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [filters.categoryId, filters.inStock, filters.maxPrice, filters.minPrice, filters.sort, page, search]);

  useEffect(() => {
    return loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const response = await fetch("/api/store/categories", { cache: "no-store" });
        const payload = (await response.json()) as CategoriesResponse;
        if (!cancelled && response.ok) {
          setCategories(payload.data.items ?? []);
        }
      } catch {
        if (!cancelled) setCategories([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main aria-busy={loading} className="space-y-6">
      <Hero />

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Destacados
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Seleccion recomendada</h2>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <a href="#catalogo">Ver todos</a>
          </Button>
        </div>
        <FeaturedProducts />
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Categorias
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Explora por tipo de producto</h2>
        </div>
        <CategoriesGrid />
      </section>

      <PromoStrip />

      <section
        id="catalogo"
        className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm scroll-mt-24 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Catalogo
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Catalogo completo</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {search ? `Resultados para "${search}".` : "Explora productos disponibles con filtros avanzados."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="sm:hidden">
              <MobileFiltersSheet
                categories={categories}
                value={filters}
                onChange={onFiltersChange}
                onReset={onResetFilters}
              />
            </div>
            <Button asChild className="rounded-full">
              <a href="/checkout">Ir a checkout</a>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <FiltersPanel categories={categories} value={filters} onChange={onFiltersChange} onReset={onResetFilters} />
          </div>
        </aside>

        <div className="space-y-4">
          {loading ? <CatalogSkeletonGrid /> : null}

          {!loading && error ? (
            <EmptyState
              title="No pudimos cargar el catalogo"
              description="Verifica tu conexion o intenta nuevamente."
              actionLabel="Reintentar"
              onAction={() => void loadCatalog()}
            />
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="No encontramos productos con esos filtros. Prueba ajustando categoria, precio o stock."
              actionLabel="Limpiar filtros"
              onAction={onResetFilters}
            />
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <>
              <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                Mostrando {meta.offset + 1}-{Math.min(meta.offset + items.length, meta.total)} de {meta.total} resultados
              </div>

              <section
                aria-label="Listado de productos"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {items.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </section>

              <Pagination page={page} pageSize={PAGE_SIZE} total={meta.total} onPageChange={onPageChange} />
            </>
          ) : null}
        </div>
      </section>

      <StoreFooter />
    </main>
  );
}
