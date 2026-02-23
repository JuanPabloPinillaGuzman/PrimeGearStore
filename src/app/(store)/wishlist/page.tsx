"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/store/EmptyState";
import { ProductCard } from "@/components/store/ProductCard";
import { RecommendedProductsSection } from "@/components/store/RecommendedProductsSection";
import { StoreFooter } from "@/components/store/StoreFooter";
import { useWishlist } from "@/components/store/hooks/useWishlist";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type WishlistProduct = {
  id: number;
  sku: string | null;
  slug: string | null;
  name: string;
  category: { id: number; name: string } | null;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
  variants?: Array<{ id: string; isInStock?: boolean }>;
};

type ProductDetailResponse = {
  data: {
    id: number;
    sku: string | null;
    slug: string | null;
    name: string;
    category: { id: number; name: string } | null;
    price: { amount: string; currency: string } | null;
    image: { url: string; alt: string | null } | null;
    variants: Array<{ id: string; isInStock?: boolean }>;
  };
};

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Skeleton className="h-52 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WishlistPage() {
  const { ready, items, products: dbWishlistProducts, isAuthenticated } = useWishlist();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugs = useMemo(() => items.filter(Boolean), [items]);
  const recommendationEndpoint = useMemo(() => {
    if (!ready) return null;
    if (isAuthenticated) return "/api/store/me/recommendations?limit=8";
    const firstProductId = products[0]?.id;
    return firstProductId ? `/api/store/recommendations?productId=${firstProductId}` : null;
  }, [isAuthenticated, products, ready]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!ready) return;
      if (isAuthenticated && dbWishlistProducts) {
        setProducts(
          dbWishlistProducts.map((item) => ({
            id: item.productId,
            sku: item.sku,
            slug: item.slug,
            name: item.name,
            category: item.category,
            price: item.price,
            image: item.image,
            variants: [],
          })),
        );
        setLoading(false);
        setError(null);
        return;
      }
      if (slugs.length === 0) {
        setProducts([]);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const responses = await Promise.all(
          slugs.map(async (slug) => {
            const response = await fetch(`/api/store/products/${encodeURIComponent(slug)}`, {
              cache: "no-store",
            });
            if (!response.ok) return null;
            const payload = (await response.json()) as ProductDetailResponse;
            return payload.data;
          }),
        );
        if (cancelled) return;
        const mapped = responses
          .filter((item): item is NonNullable<typeof item> => !!item)
          .map((item) => ({
            id: item.id,
            sku: item.sku,
            slug: item.slug,
            name: item.name,
            category: item.category,
            price: item.price,
            image: item.image,
            variants: item.variants,
          }));
        const orderMap = new Map(slugs.map((slug, index) => [slug, index]));
        mapped.sort((a, b) => (orderMap.get(a.slug ?? "") ?? 9999) - (orderMap.get(b.slug ?? "") ?? 9999));
        setProducts(mapped);
      } catch {
        if (!cancelled) {
          setError("No fue posible cargar tus favoritos.");
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [dbWishlistProducts, isAuthenticated, ready, slugs]);

  return (
    <main className="space-y-6 pb-6">
      <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Wishlist</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Tus favoritos</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Guarda productos para revisarlos después y agregarlos al carrito cuando quieras.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/store">Seguir comprando</Link>
          </Button>
        </div>
      </section>

      {!ready || loading ? <WishlistSkeleton /> : null}

      {ready && !loading && error ? (
        <EmptyState
          title="No pudimos cargar tus favoritos"
          description={error}
          actionLabel="Reintentar"
          onAction={() => window.location.reload()}
        />
      ) : null}

      {ready && !loading && !error && products.length === 0 ? (
        <EmptyState
          title="Tu wishlist esta vacia"
          description="Marca productos con el icono de corazon para guardarlos aqui."
          actionLabel="Explorar catalogo"
          onAction={() => (window.location.href = "/store")}
        />
      ) : null}

      {ready && !loading && !error && products.length > 0 ? (
        <section
          aria-label="Productos favoritos"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : null}

      <RecommendedProductsSection
        title="Te recomendamos"
        endpoint={recommendationEndpoint}
        emptyDescription="Agrega favoritos o realiza compras para recibir mejores recomendaciones."
      />

      <StoreFooter />
    </main>
  );
}
