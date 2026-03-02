"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Price } from "@/components/store/Price";
import { useCart } from "@/components/store/useCart";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

type MiniCartItem = {
  id: string;
  productId: number;
  productName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: string;
  unitPriceSnapshot: string;
  lineTotal: string;
  currency: string;
};

type MiniCartResponse = {
  data: {
    cartId: string;
    status: string;
    items: MiniCartItem[];
    totals: {
      subtotal: string;
      currency: string;
      itemsCount: number;
    };
  };
};

export function MiniCartSheet() {
  const { cartId, ready } = useCart();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<MiniCartResponse["data"] | null>(null);

  useEffect(() => {
    if (!open || !cartId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/store/cart?cartId=${encodeURIComponent(cartId ?? "")}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("No fue posible cargar carrito.");
        const payload = (await response.json()) as MiniCartResponse;
        if (!cancelled) setCart(payload.data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No fue posible cargar carrito.");
          setCart(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, cartId]);

  const itemCount = useMemo(() => cart?.totals.itemsCount ?? 0, [cart]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <ShoppingBag className="size-4" />
          <span className="hidden sm:inline">Carrito</span>
          {itemCount > 0 ? (
            <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              {itemCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Tu carrito</SheetTitle>
          <SheetDescription>
            {ready ? (cartId ? "Resumen rapido antes de checkout." : "Aun no has agregado productos.") : "Cargando..."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {!ready ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : null}

          {ready && !cartId ? (
            <p className="text-sm text-muted-foreground">No hay carrito activo todavía.</p>
          ) : null}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : null}

          {!loading && error ? <p className="text-sm text-red-600">{error}</p> : null}

          {!loading &&
            !error &&
            cart?.items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/70 p-3">
                <p className="text-sm font-medium">{item.productName}</p>
                {item.variantName ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.variantName}</p>
                ) : null}
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Cant. {item.quantity}</span>
                  <Price amount={item.lineTotal} currency={item.currency} className="text-sm font-semibold text-foreground" />
                </div>
              </div>
            ))}

          {!loading && !error && cart && cart.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">El carrito esta vacio.</p>
          ) : null}
        </div>

        <div className="border-t border-border/60 p-5">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <Price
              amount={cart?.totals.subtotal}
              currency={cart?.totals.currency ?? "COP"}
              className="font-semibold"
            />
          </div>
          <Button asChild className="w-full rounded-full" disabled={!cartId}>
            <Link href={cartId ? `/checkout?cartId=${encodeURIComponent(cartId)}` : "/checkout"}>
              Ir a checkout
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
