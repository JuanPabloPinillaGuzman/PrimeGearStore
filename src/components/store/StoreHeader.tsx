"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

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

export function StoreHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tiendaOpen, setTiendaOpen] = useState(false);
  const tiendaRef = useRef<HTMLDivElement>(null);

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

  // Fetch categories for dropdown
  useEffect(() => {
    fetch("/api/store/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { data?: { items?: Category[] } }) => setCategories(d.data?.items ?? []))
      .catch(() => setCategories([]));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (tiendaRef.current && !tiendaRef.current.contains(e.target as Node)) {
        setTiendaOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const closeSpotlight = useCallback(() => setSpotlightOpen(false), []);

  const isStore = pathname.startsWith("/store") || pathname === "/";

  return (
    <>
      <motion.header
        animate={{ height: scrolled ? 48 : 56 }}
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
            {/* Tienda dropdown */}
            <div ref={tiendaRef} className="relative">
              <button
                onClick={() => setTiendaOpen((v) => !v)}
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
                    {/* All products */}
                    <Link
                      href="/store"
                      onClick={() => setTiendaOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/60 transition-colors border-b border-border/40"
                    >
                      Todos los productos
                    </Link>
                    {/* Categories */}
                    <div className="py-1 max-h-72 overflow-y-auto">
                      {categories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/store?categoryId=${cat.id}`}
                          onClick={() => setTiendaOpen(false)}
                          className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                        >
                          <span>{cat.name}</span>
                          <span className="text-xs text-muted-foreground/60">{cat.activeProductsCount}</span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* Search */}
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              aria-label="Buscar (Ctrl+K)"
              onClick={() => setSpotlightOpen(true)}
            >
              <Search className="size-4" />
            </Button>

            {/* Theme */}
            <ThemeToggle />

            {/* Account */}
            <AccountMenu />

            {/* Cart */}
            <MiniCartSheet />
          </div>
        </div>
      </motion.header>

      <SpotlightSearch open={spotlightOpen} onClose={closeSpotlight} />
    </>
  );
}
