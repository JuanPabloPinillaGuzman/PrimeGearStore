"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/store/EmptyState";
import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

type FeaturedProduct = {
  id: number;
  sku: string | null;
  slug: string | null;
  name: string;
  category: { id: number; name: string } | null;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
  variants?: Array<{ id: string; isInStock?: boolean }>;
};

type CatalogResponse = {
  data: FeaturedProduct[];
};

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeaturedProducts() {
  const [items, setItems] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/store/catalog?limit=8&offset=0&expand=variants", {
          cache: "no-store",
        });
        const payload = (await response.json()) as CatalogResponse | { error?: { message?: string } };
        if (!response.ok || !("data" in payload)) {
          throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar destacados.");
        }
        if (!cancelled) {
          setItems(payload.data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No fue posible cargar destacados.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <FeaturedSkeleton />;

  if (error) {
    return (
      <EmptyState
        title="No pudimos cargar destacados"
        description={error}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin destacados"
        description="Aún no hay productos visibles para mostrar en esta sección."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <ProductCard key={item.id} product={item} />
      ))}
    </div>
  );
}
