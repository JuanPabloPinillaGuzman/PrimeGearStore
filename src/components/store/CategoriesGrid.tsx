"use client";

import Link from "next/link";
import { Dumbbell, Keyboard, ShoppingBag, Star, Tag, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/store/EmptyState";
import { useScrollReveal } from "@/components/store/hooks/useScrollReveal";
import { Skeleton } from "@/components/ui/skeleton";

type CategoryItem = {
  id: number;
  name: string;
  activeProductsCount: number;
};

type CategoriesResponse = {
  data: {
    items: CategoryItem[];
  };
};

const CATEGORY_ICONS = [Keyboard, Dumbbell, Tag, Star, Zap, ShoppingBag];

function CategorySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card/80 p-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="mt-4 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function CategoriesGrid() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerRef, headerVisible] = useScrollReveal();

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/store/categories", { cache: "no-store" });
        const payload = (await res.json()) as CategoriesResponse | { error?: { message?: string } };
        if (!res.ok || !("data" in payload)) {
          throw new Error(("error" in payload && payload.error?.message) || "Error al cargar categorías.");
        }
        if (!cancelled) {
          setItems(payload.data.items.filter((item) => item.activeProductsCount > 0));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar categorías.");
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
    <div className="w-full py-20 dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10 text-center"
        >
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/80">
            Categorías
          </p>
          <h2 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Explora por tipo de producto
          </h2>
        </motion.div>

        {/* Grid */}
        {loading ? (
          <CategorySkeleton />
        ) : error ? (
          <EmptyState title="No pudimos cargar categorías" description={error} />
        ) : items.length === 0 ? (
          <EmptyState title="Sin categorías" description="Aún no hay categorías con productos activos." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {items.slice(0, 12).map((item, index) => {
              const Icon = CATEGORY_ICONS[index % CATEGORY_ICONS.length];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
                >
                  <Link
                    href={`/store?categoryId=${item.id}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary transition group-hover:bg-primary/12">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="line-clamp-2 text-sm font-semibold tracking-tight">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.activeProductsCount} productos
                      </p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
