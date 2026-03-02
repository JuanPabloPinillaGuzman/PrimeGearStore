"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/store/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

function CategoryIcon({ index }: { index: number }) {
  const shapes = [
    "M7 17l5-10 5 10",
    "M6 8h12v8H6z",
    "M12 5l6 4v10l-6 0-6 0V9z",
    "M7 7h10v10H7z M9 9h6v6H9z",
  ];
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary/70" fill="none" aria-hidden="true">
      <path
        d={shapes[index % shapes.length]}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/70 p-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/store/categories", { cache: "no-store" });
        const payload = (await response.json()) as CategoriesResponse | { error?: { message?: string } };
        if (!response.ok || !("data" in payload)) {
          throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar categorías.");
        }
        if (!cancelled) {
          setItems(payload.data.items.filter((item) => item.activeProductsCount > 0));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No fue posible cargar categorías.");
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

  if (loading) return <CategoriesSkeleton />;
  if (error) {
    return <EmptyState title="No pudimos cargar categorías" description={error} />;
  }
  if (items.length === 0) {
    return <EmptyState title="Sin categorías" description="Aún no hay categorías con productos activos." />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.slice(0, 12).map((item, index) => (
        <Link
          key={item.id}
          href={`/store?search=${encodeURIComponent(item.name)}`}
          className={cn(
            "group rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm transition",
            "hover:-translate-y-0.5 hover:shadow-md hover:border-primary/25",
          )}
        >
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 transition group-hover:border-primary/20 group-hover:bg-primary/5">
            <CategoryIcon index={index} />
          </div>
          <p className="mt-3 line-clamp-2 text-sm font-medium tracking-tight">{item.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.activeProductsCount} productos</p>
        </Link>
      ))}
    </div>
  );
}
