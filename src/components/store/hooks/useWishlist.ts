"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getErrorMessage, requestJson } from "@/lib/http/client";
import { mergeWishlistProductIds } from "@/lib/store/wishlist-utils";

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
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const syncGuest = useCallback(() => {
    setGuestSlugs(readLocalWishlist());
    setReady(true);
  }, []);

  const loadAuthStateAndWishlist = useCallback(async () => {
    try {
      const mePayload = await requestJson<MeResponse>("/api/store/me", { cache: "no-store" }).catch(() => null);
      if (!mePayload || mePayload.data.role !== "CUSTOMER" || !mePayload.data.customer) {
        setIsAuthenticated(false);
        setProducts(null);
        syncGuest();
        return;
      }

      setIsAuthenticated(true);

      const localSlugs = readLocalWishlist();
      if (localSlugs.length > 0) {
        const productIds = await resolveProductIdsFromLocalSlugs(localSlugs);
        const merged = mergeWishlistProductIds(productIds, []);
        if (merged.length > 0) {
          await requestJson<{ data: unknown }>("/api/store/me/wishlist/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: merged }),
          });
        }
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(WISHLIST_KEY);
          dispatchWishlistUpdated();
        }
        setGuestSlugs([]);
      }

      const wishlistPayload = await requestJson<WishlistApiResponse>("/api/store/me/wishlist", { cache: "no-store" });
      setProducts(wishlistPayload.data.items);
      setReady(true);
    } catch {
      setIsAuthenticated(false);
      setProducts(null);
      syncGuest();
    }
  }, [syncGuest]);

  useEffect(() => {
    if (!actionMessage && !actionError) return;
    const timer = window.setTimeout(() => {
      setActionMessage(null);
      setActionError(null);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [actionError, actionMessage]);

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
      try {
        if (isAuthenticated) {
          if (!productId) return false;
          const payload = await requestJson<{ data?: { added?: boolean } }>("/api/store/me/wishlist/toggle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });
          await loadAuthStateAndWishlist();
          const added = Boolean(payload.data?.added);
          setActionMessage(added ? "Agregado a favoritos." : "Eliminado de favoritos.");
          setActionError(null);
          return added;
        }

        if (!slug) return false;
        const current = readLocalWishlist();
        if (current.includes(slug)) {
          const next = current.filter((item) => item !== slug);
          writeLocalWishlist(next);
          setGuestSlugs(next);
          setActionMessage("Eliminado de favoritos.");
          setActionError(null);
          return false;
        }
        const next = [...current, slug];
        writeLocalWishlist(next);
        setGuestSlugs(next);
        setActionMessage("Agregado a favoritos.");
        setActionError(null);
        return true;
      } catch (error) {
        setActionMessage(null);
        setActionError(getErrorMessage(error, "No fue posible actualizar favoritos."));
        throw error;
      }
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
    actionMessage,
    actionError,
  };
}
