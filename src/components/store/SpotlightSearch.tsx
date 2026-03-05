"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, X, Tag, Package } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState, useCallback } from "react";

import { Price } from "@/components/store/Price";

type SearchProduct = {
  id: number;
  slug: string | null;
  name: string;
  category: { id: number; name: string } | null;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
};

type Category = {
  id: number;
  name: string;
  slug: string | null;
};

type SearchResult = {
  products: SearchProduct[];
  categories: Category[];
};

interface SpotlightSearchProps {
  open: boolean;
  onClose: () => void;
}

export function SpotlightSearch({ open, onClose }: SpotlightSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults({ products: [], categories: [] });
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ products: [], categories: [] });
      return;
    }
    setLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/store/catalog?search=${encodeURIComponent(q)}&limit=5`, { cache: "no-store" }),
        fetch("/api/store/categories", { cache: "no-store" }),
      ]);
      const productsData = productsRes.ok
        ? ((await productsRes.json()) as { data: { items: SearchProduct[] } })
        : null;
      const categoriesData = categoriesRes.ok
        ? ((await categoriesRes.json()) as { data: Category[] })
        : null;

      const filteredCategories = (categoriesData?.data ?? []).filter((c) =>
        c.name.toLowerCase().includes(q.toLowerCase()),
      );

      setResults({
        products: productsData?.data.items ?? [],
        categories: filteredCategories.slice(0, 3),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void search(val);
    }, 300);
  }

  const hasResults = results.products.length > 0 || results.categories.length > 0;

  return (
    <AnimatePresence>
      {open ? (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed left-1/2 top-[12vh] z-50 w-full max-w-2xl -translate-x-1/2 px-4"
          >
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
              {/* Input */}
              <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
                <Search className="size-5 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={handleChange}
                  placeholder="Buscar productos, categorías..."
                  className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                  aria-label="Búsqueda en la tienda"
                />
                {query ? (
                  <button
                    onClick={() => {
                      setQuery("");
                      setResults({ products: [], categories: [] });
                      inputRef.current?.focus();
                    }}
                    className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="size-4" />
                  </button>
                ) : (
                  <kbd className="hidden rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
                    Esc
                  </kbd>
                )}
              </div>

              {/* Results */}
              {query && (
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  {loading && (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Buscando...
                    </div>
                  )}

                  {!loading && !hasResults && (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No se encontraron resultados para{" "}
                      <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
                    </div>
                  )}

                  {/* Categories */}
                  {!loading && results.categories.length > 0 && (
                    <div className="mb-2">
                      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Categorías
                      </p>
                      {results.categories.map((cat, i) => (
                        <motion.div
                          key={cat.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <Link
                            href={`/store?categoryId=${cat.id}`}
                            onClick={onClose}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted"
                          >
                            <Tag className="size-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{cat.name}</span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Products */}
                  {!loading && results.products.length > 0 && (
                    <div>
                      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Productos
                      </p>
                      {results.products.map((product, i) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 + 0.05 }}
                        >
                          <Link
                            href={
                              product.slug ? `/products/${product.slug}` : `/products/${product.id}`
                            }
                            onClick={onClose}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted"
                          >
                            {product.image?.url ? (
                              <Image
                                src={product.image.url}
                                alt={product.image.alt ?? product.name}
                                width={40}
                                height={40}
                                className="size-10 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <Package className="size-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{product.name}</p>
                              {product.category && (
                                <p className="text-xs text-muted-foreground">{product.category.name}</p>
                              )}
                            </div>
                            {product.price && (
                              <Price
                                amount={product.price.amount}
                                currency={product.price.currency}
                                className="shrink-0 text-sm font-semibold"
                              />
                            )}
                          </Link>
                        </motion.div>
                      ))}

                      <Link
                        href={`/store?search=${encodeURIComponent(query)}`}
                        onClick={onClose}
                        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-primary hover:bg-muted"
                      >
                        <Search className="size-3.5" />
                        Ver todos los resultados para &ldquo;{query}&rdquo;
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Empty state hint */}
              {!query && (
                <div className="px-4 py-5 text-sm text-muted-foreground">
                  Empieza a escribir para buscar productos o categorías.
                </div>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
