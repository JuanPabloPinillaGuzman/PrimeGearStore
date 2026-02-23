"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/brand/BrandMark";
import { AccountMenu } from "@/components/store/AccountMenu";
import { MiniCartSheet } from "@/components/store/MiniCartSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StoreHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isStorePage = pathname === "/store";

  const [searchValue, setSearchValue] = useState(() => searchParams.get("search") ?? "");

  useEffect(() => {
    if (!isStorePage) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const next = searchValue.trim();
      if (next) params.set("search", next);
      else params.delete("search");
      params.delete("page");
      params.delete("limit");
      params.delete("offset");
      const qs = params.toString();
      const nextUrl = qs ? `/store?${qs}` : "/store";
      const currentUrl = searchParams.toString() ? `/store?${searchParams.toString()}` : "/store";
      if (nextUrl !== currentUrl) {
        router.replace(nextUrl);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [isStorePage, router, searchParams, searchValue]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/store" className="shrink-0">
          <BrandMark className="hidden sm:inline-flex" />
          <BrandMark compact className="sm:hidden" />
        </Link>

        <div className="mx-auto hidden w-full max-w-xl items-center md:flex">
          <label htmlFor="store-search" className="sr-only">
            Buscar productos
          </label>
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="store-search"
              type="search"
              placeholder="Buscar por nombre o SKU"
              aria-label="Buscar productos"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="h-10 rounded-full border-border/70 bg-background/80 pl-9 pr-4 shadow-xs"
              disabled={!isStorePage}
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="icon-sm" className="rounded-full" aria-label="Wishlist">
            <Link href="/wishlist">
              <Heart className="size-4" />
            </Link>
          </Button>
          <AccountMenu />
          <MiniCartSheet />
          <Button asChild variant="outline" className="hidden rounded-full sm:inline-flex">
            <Link href="/checkout" aria-label="Ir al checkout">
              Checkout
            </Link>
          </Button>
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-3 md:hidden">
        <div className="mx-auto max-w-7xl">
          <label htmlFor="store-search-mobile" className="sr-only">
            Buscar productos
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="store-search-mobile"
              type="search"
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="h-10 rounded-full border-border/70 bg-background/80 pl-9"
              disabled={!isStorePage}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
