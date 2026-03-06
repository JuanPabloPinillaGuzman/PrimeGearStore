"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useState } from "react";

import { BrandMark } from "@/components/brand/BrandMark";
import { AccountMenu } from "@/components/store/AccountMenu";
import { MiniCartSheet } from "@/components/store/MiniCartSheet";
import { ThemeToggle } from "@/components/store/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SpotlightSearch = dynamic(
  () => import("@/components/store/SpotlightSearch").then((m) => ({ default: m.SpotlightSearch })),
  { ssr: false },
);

type Category = { id: number; name: string; activeProductsCount: number };
type CatProduct = { id: number; name: string; slug: string | null; price: { amount: string; currency: string } | null };

// Shared product list used inside both the Tienda flyout and CategoryPill dropdowns
function ProductList({
  loading,
  products,
  onClose,
}: {
  loading: boolean;
  products: CatProduct[] | undefined;
  onClose: () => void;
}) {
  if (loading) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Cargando...</div>;
  }
  if (!products || products.length === 0) {
    return <div className="px-4 py-3 text-xs text-muted-foreground">Sin productos.</div>;
  }
  return (
    <>
      {products.map((p) => (
        <Link
          key={p.id}
          href={p.slug ? `/products/${p.slug}` : `/store/products/${p.id}`}
          onClick={onClose}
          className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <span className="line-clamp-1">{p.name}</span>
          {p.price && (
            <span className="ml-2 shrink-0 text-xs text-muted-foreground/60">
              {Number(p.price.amount).toLocaleString("es-CO", {
                style: "currency",
                currency: p.price.currency,
                maximumFractionDigits: 0,
              })}
            </span>
          )}
        </Link>
      ))}
    </>
  );
}

// Row used inside the Tienda dropdown — shows a flyout to the right on hover
function TiendaCategoryRow({
  cat,
  catProducts,
  catLoading,
  onHover,
  onClose,
}: {
  cat: Category;
  catProducts: Map<number, CatProduct[]>;
  catLoading: Set<number>;
  onHover: (id: number) => void;
  onClose: () => void;
}) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setFlyoutOpen(true);
        onHover(cat.id);
      }}
      onMouseLeave={() => setFlyoutOpen(false)}
    >
      <Link
        href={`/store?categoryId=${cat.id}`}
        onClick={onClose}
        className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
      >
        <span>{cat.name}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground/60">{cat.activeProductsCount}</span>
          <ChevronRight className="size-3 shrink-0" />
        </div>
      </Link>

      <AnimatePresence>
        {flyoutOpen && (
          <motion.div
            initial={{ opacity: 0, x: -6, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-full top-0 ml-1 w-64 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-xl shadow-black/10 backdrop-blur-xl z-50"
          >
            <Link
              href={`/store?categoryId=${cat.id}`}
              onClick={onClose}
              className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors border-b border-border/40"
            >
              <span>Ver todos en {cat.name}</span>
              <span className="text-xs text-muted-foreground/60">{cat.activeProductsCount}</span>
            </Link>
            <div className="py-1">
              <ProductList
                loading={catLoading.has(cat.id)}
                products={catProducts.get(cat.id)}
                onClose={onClose}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Pill in the nav bar — shows a dropdown below on hover
function CategoryPill({
  cat,
  catProducts,
  catLoading,
  onHover,
}: {
  cat: Category;
  catProducts: Map<number, CatProduct[]>;
  catLoading: Set<number>;
  onHover: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        setOpen(true);
        onHover(cat.id);
      }}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-colors">
        {cat.name}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-xl shadow-black/10 backdrop-blur-xl z-50"
          >
            <Link
              href={`/store?categoryId=${cat.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors border-b border-border/40"
            >
              <span>Ver todos en {cat.name}</span>
              <span className="text-xs text-muted-foreground/60">{cat.activeProductsCount}</span>
            </Link>
            <div className="py-1">
              <ProductList
                loading={catLoading.has(cat.id)}
                products={catProducts.get(cat.id)}
                onClose={() => setOpen(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StoreHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tiendaOpen, setTiendaOpen] = useState(false);

  const [catProducts, setCatProducts] = useState<Map<number, CatProduct[]>>(new Map());
  const [catLoading, setCatLoading] = useState<Set<number>>(new Set());

  // Scroll shrink
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSpotlightOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Fetch categories
  useEffect(() => {
    fetch("/api/store/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { data?: { items?: Category[] } }) => setCategories(d.data?.items ?? []))
      .catch(() => setCategories([]));
  }, []);

  const closeSpotlight = useCallback(() => setSpotlightOpen(false), []);

  const isStore = pathname.startsWith("/store") || pathname === "/";

  function handleCatHover(catId: number) {
    if (catProducts.has(catId) || catLoading.has(catId)) return;
    setCatLoading((prev) => new Set([...prev, catId]));
    fetch(`/api/store/catalog?categoryId=${catId}&limit=6`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { data?: CatProduct[] }) => {
        setCatProducts((prev) => new Map([...prev, [catId, d.data ?? []]]));
      })
      .catch(() => {
        setCatProducts((prev) => new Map([...prev, [catId, []]]));
      })
      .finally(() => {
        setCatLoading((prev) => {
          const next = new Set(prev);
          next.delete(catId);
          return next;
        });
      });
  }

  return (
    <>
      <motion.header
        animate={{ height: scrolled ? 56 : 68 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className={cn(
          "sticky top-0 z-40 w-full overflow-visible",
          "glass border-b",
          scrolled ? "shadow-sm" : "shadow-none",
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          {/* Brand */}
          <Link href="/" className="shrink-0" aria-label="PrimeGearStore Home">
            <BrandMark className="hidden sm:inline-flex" />
            <BrandMark compact className="sm:hidden" />
          </Link>

          {/* Nav — desktop */}
          <nav className="mx-6 hidden items-center gap-1 md:flex" aria-label="Navegación principal">

            {/* Tienda — hover-based dropdown with category rows + flyout submenus */}
            <div
              className="relative"
              onMouseEnter={() => setTiendaOpen(true)}
              onMouseLeave={() => setTiendaOpen(false)}
            >
              <button
                aria-expanded={tiendaOpen}
                aria-haspopup="true"
                className={cn(
                  "flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isStore
                    ? "bg-foreground/8 text-foreground"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                Tienda
                <ChevronDown
                  className={cn("size-3.5 transition-transform", tiendaOpen && "rotate-180")}
                />
              </button>

              <AnimatePresence>
                {tiendaOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute left-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-xl shadow-black/10 backdrop-blur-xl"
                  >
                    <Link
                      href="/store"
                      onClick={() => setTiendaOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors border-b border-border/40"
                    >
                      Todos los productos
                    </Link>
                    <div className="py-1">
                      {categories.map((cat) => (
                        <TiendaCategoryRow
                          key={cat.id}
                          cat={cat}
                          catProducts={catProducts}
                          catLoading={catLoading}
                          onHover={handleCatHover}
                          onClose={() => setTiendaOpen(false)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Category pills (top 5) */}
            {categories.slice(0, 5).map((cat) => (
              <CategoryPill
                key={cat.id}
                cat={cat}
                catProducts={catProducts}
                catLoading={catLoading}
                onHover={handleCatHover}
              />
            ))}
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              aria-label="Buscar (Ctrl+K)"
              onClick={() => setSpotlightOpen(true)}
            >
              <Search className="size-4" />
            </Button>
            <ThemeToggle />
            <AccountMenu />
            <MiniCartSheet />
          </div>
        </div>
      </motion.header>

      <SpotlightSearch open={spotlightOpen} onClose={closeSpotlight} />
    </>
  );
}
