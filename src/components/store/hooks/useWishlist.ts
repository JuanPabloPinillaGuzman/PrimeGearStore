"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const WISHLIST_KEY = "pg_wishlist";
const WISHLIST_EVENT = "pg-wishlist-updated";

type WishlistProduct = {
  productId: number;
  slug: string | null;
  sku: string | null;
  name: string;
  category: { id: number; name: string } | null;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
  isActive?: boolean;
};

type MeResponse = {
  data: {
    email: string;
    role: string;
    customer: { id: number } | null;
  };
};

type WishlistApiResponse = {
  data: {
    items: WishlistProduct[];
  };
};

function dispatchWishlistUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WISHLIST_EVENT));
}

function readLocalWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  } catch {
    return [];
  }
}

function writeLocalWishlist(items: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  dispatchWishlistUpdated();
}

async function resolveProductIdsFromLocalSlugs(slugs: string[]) {
  const responses = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const response = await fetch(`/api/store/products/${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!response.ok) return null;
        const payload = (await response.json()) as { data?: { id?: number } };
        return payload.data?.id ?? null;
      } catch {
        return null;
      }
    }),
  );
  return Array.from(new Set(responses.filter((value): value is number => typeof value === "number")));
}

export function useWishlist() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<WishlistProduct[] | null>(null);
  const [guestSlugs, setGuestSlugs] = useState<string[]>([]);

  const syncGuest = useCallback(() => {
    setGuestSlugs(readLocalWishlist());
    setReady(true);
  }, []);

  const loadAuthStateAndWishlist = useCallback(async () => {
    try {
      const meResponse = await fetch("/api/store/me", { cache: "no-store" });
      const mePayload = (await meResponse.json()) as MeResponse | { error?: { message?: string } };
      if (!meResponse.ok || !("data" in mePayload) || mePayload.data.role !== "CUSTOMER" || !mePayload.data.customer) {
        setIsAuthenticated(false);
        setProducts(null);
        syncGuest();
        return;
      }

      setIsAuthenticated(true);

      const localSlugs = readLocalWishlist();
      if (localSlugs.length > 0) {
        const productIds = await resolveProductIdsFromLocalSlugs(localSlugs);
        if (productIds.length > 0) {
          await fetch("/api/store/me/wishlist/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds }),
          });
        }
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(WISHLIST_KEY);
          dispatchWishlistUpdated();
        }
        setGuestSlugs([]);
      }

      const wishlistResponse = await fetch("/api/store/me/wishlist", { cache: "no-store" });
      const wishlistPayload = (await wishlistResponse.json()) as WishlistApiResponse | { error?: { message?: string } };
      if (!wishlistResponse.ok || !("data" in wishlistPayload)) {
        setProducts([]);
      } else {
        setProducts(wishlistPayload.data.items);
      }
      setReady(true);
    } catch {
      setIsAuthenticated(false);
      setProducts(null);
      syncGuest();
    }
  }, [syncGuest]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void loadAuthStateAndWishlist();
    }, 0);
    const onSync = () => {
      void loadAuthStateAndWishlist();
    };
    window.addEventListener(WISHLIST_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener(WISHLIST_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, [loadAuthStateAndWishlist]);

  const toggle = useCallback(
    async (input: { slug?: string | null; productId?: number | null }) => {
      const { slug, productId } = input;
      if (isAuthenticated) {
        if (!productId) return false;
        const response = await fetch("/api/store/me/wishlist/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        const payload = (await response.json()) as { data?: { added?: boolean } };
        if (!response.ok) {
          throw new Error("No fue posible actualizar favoritos.");
        }
        await loadAuthStateAndWishlist();
        return Boolean(payload.data?.added);
      }

      if (!slug) return false;
      const current = readLocalWishlist();
      if (current.includes(slug)) {
        const next = current.filter((item) => item !== slug);
        writeLocalWishlist(next);
        setGuestSlugs(next);
        return false;
      }
      const next = [...current, slug];
      writeLocalWishlist(next);
      setGuestSlugs(next);
      return true;
    },
    [isAuthenticated, loadAuthStateAndWishlist],
  );

  const items = useMemo(
    () => (isAuthenticated ? (products ?? []).map((item) => item.slug).filter((v): v is string => !!v) : guestSlugs),
    [guestSlugs, isAuthenticated, products],
  );

  const has = useCallback(
    (input: { slug?: string | null; productId?: number | null }) => {
      if (isAuthenticated) {
        if (!products) return false;
        if (typeof input.productId === "number") return products.some((item) => item.productId === input.productId);
        if (input.slug) return products.some((item) => item.slug === input.slug);
        return false;
      }
      if (!input.slug) return false;
      return guestSlugs.includes(input.slug);
    },
    [guestSlugs, isAuthenticated, products],
  );

  return {
    ready,
    isAuthenticated,
    items,
    products,
    has,
    toggle,
    refresh: loadAuthStateAndWishlist,
  };
}

