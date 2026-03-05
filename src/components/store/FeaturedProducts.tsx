"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

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

// Card dimensions — keep in sync with ProductCard's featured image height
const CARD_WIDTH = 288;  // w-72  = 288 px
const CARD_HEIGHT = 400; // h-[400px]
const CARD_GAP = 20;     // gap-5  = 20 px

function FeaturedSkeleton() {
  return (
    <div className="flex gap-5 overflow-x-hidden overflow-y-hidden">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          style={{ height: CARD_HEIGHT }}
          className="w-72 shrink-0 overflow-hidden rounded-2xl border border-border/70 bg-card"
        >
          {/* Fixed-height image placeholder */}
          <Skeleton className="h-52 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="mt-2 h-10 w-full rounded-full" />
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Fetch featured products
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          "/api/store/catalog?featured=true&limit=8&offset=0&expand=variants",
          { cache: "no-store" },
        );
        const payload = (await res.json()) as
          | CatalogResponse
          | { error?: { message?: string } };
        if (!res.ok || !("data" in payload)) {
          throw new Error(
            ("error" in payload && payload.error?.message) ||
              "Error al cargar destacados.",
          );
        }
        if (!cancelled)
          setItems(Array.isArray(payload.data) ? payload.data : []);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Error al cargar destacados.",
          );
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Arrow visibility — re-evaluated every time items change or the container is resized/scrolled
  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Wait one frame so the browser has painted the cards and scrollWidth is final
    const raf = requestAnimationFrame(updateArrows);
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [items]);

  function handleScroll(direction: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -(CARD_WIDTH + CARD_GAP) : CARD_WIDTH + CARD_GAP,
      behavior: "smooth",
    });
  }

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

      {/* Carousel */}
      {loading ? (
        <FeaturedSkeleton />
      ) : error ? (
        <EmptyState title="No pudimos cargar destacados" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Sin destacados"
          description="Configura productos destacados en el panel de administración."
        />
      ) : (
        <div className="relative">
          {/* ← Left arrow */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: canScrollLeft ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleScroll("left")}
            aria-label="Anterior"
            disabled={!canScrollLeft}
            className="absolute -left-5 top-1/2 z-10 -translate-y-1/2 flex size-12 items-center justify-center rounded-full border border-border/60 bg-card/90 shadow-lg backdrop-blur-sm transition-colors hover:bg-card disabled:pointer-events-none"
          >
            <ChevronLeft className="size-5" />
          </motion.button>

          {/* Scroll container — overflow-y-hidden prevents the browser from implicitly
              setting overflow-y: auto when overflow-x is not visible */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-hidden overflow-y-hidden"
          >
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                // Use animate (not whileInView) so all cards are fully rendered
                // from mount regardless of whether they're clipped by overflow-x
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
                style={{ height: CARD_HEIGHT }}
                className="w-72 shrink-0"
              >
                <ProductCard product={item} variant="featured" />
              </motion.div>
            ))}
          </div>

          {/* → Right arrow */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: canScrollRight ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleScroll("right")}
            aria-label="Siguiente"
            disabled={!canScrollRight}
            className="absolute -right-5 top-1/2 z-10 -translate-y-1/2 flex size-12 items-center justify-center rounded-full border border-border/60 bg-card/90 shadow-lg backdrop-blur-sm transition-colors hover:bg-card disabled:pointer-events-none"
          >
            <ChevronRight className="size-5" />
          </motion.button>
        </div>
      )}
    </div>
  );
}
