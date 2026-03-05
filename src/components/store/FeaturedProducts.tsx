"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/store/EmptyState";
import { useScrollReveal } from "@/components/store/hooks/useScrollReveal";
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
  meta: { total: number; limit: number; offset: number };
};

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <Skeleton className="h-60 w-full rounded-none" />
          <div className="space-y-3 p-5">
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
  const [headerRef, headerVisible] = useScrollReveal();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/store/catalog?limit=4&offset=0&expand=variants", {
          cache: "no-store",
        });
        const payload = (await res.json()) as CatalogResponse | { error?: { message?: string } };
        if (!res.ok || !("data" in payload)) {
          throw new Error(("error" in payload && payload.error?.message) || "Error al cargar destacados.");
        }
        if (!cancelled) setItems(Array.isArray(payload.data) ? payload.data : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar destacados.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      {/* Section header */}
      <motion.div
        ref={headerRef}
        initial={{ opacity: 0, y: 20 }}
        animate={headerVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center"
      >
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/70">
          Destacados
        </p>
        <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Selección recomendada
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Los productos más populares de nuestra colección.
        </p>
      </motion.div>

      {/* Grid */}
      {loading ? (
        <FeaturedSkeleton />
      ) : error ? (
        <EmptyState title="No pudimos cargar destacados" description={error} />
      ) : items.length === 0 ? (
        <EmptyState title="Sin destacados" description="Aún no hay productos visibles en esta sección." />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.05 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
            >
              <ProductCard product={item} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
