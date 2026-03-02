"use client";

import { useEffect, useState } from "react";

import { ProductCard } from "@/components/store/ProductCard";
import { EmptyState } from "@/components/store/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

type ProductCardLike = {
  id: number;
  sku: string | null;
  slug: string | null;
  name: string;
  category: { id: number; name: string } | null;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
  variants?: Array<{ id: string; isInStock?: boolean }>;
};

type Props = {
  title?: string;
  endpoint: string | null;
  emptyDescription?: string;
};

function RecoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Skeleton className="h-44 w-full rounded-none" />
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

export function RecommendedProductsSection({
  title = "Te recomendamos",
  endpoint,
  emptyDescription = "No hay recomendaciones disponibles por ahora.",
}: Props) {
  const [items, setItems] = useState<ProductCardLike[]>([]);
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!endpoint) {
        setLoading(false);
        setItems([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const payload = (await response.json()) as { data?: { items?: ProductCardLike[] } };
        if (!response.ok || !payload.data?.items) throw new Error("No fue posible cargar recomendaciones.");
        if (!cancelled) setItems(payload.data.items);
      } catch (err) {
        if (!cancelled) {
          setItems([]);
          setError(err instanceof Error ? err.message : "No fue posible cargar recomendaciones.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return (
    <section className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>
      {loading ? <RecoSkeleton /> : null}
      {!loading && error ? (
        <EmptyState title="No pudimos cargar recomendaciones" description={error} />
      ) : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState title="Sin recomendaciones" description={emptyDescription} />
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

