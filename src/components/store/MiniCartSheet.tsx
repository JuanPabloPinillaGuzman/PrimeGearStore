"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { CartItemRow } from "@/components/store/CartItemRow";
import { Price } from "@/components/store/Price";
import { dispatchCartUpdated, useCart } from "@/components/store/useCart";
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
    totals: { subtotal: string; currency: string; itemsCount: number };
  };
};

export function MiniCartSheet() {
  const { cartId, ready } = useCart();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState<string | null>(null); // itemId being mutated
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<MiniCartResponse["data"] | null>(null);

  async function loadCart() {
    if (!cartId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/store/cart?cartId=${encodeURIComponent(cartId)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("No fue posible cargar el carrito.");
      const payload = (await res.json()) as MiniCartResponse;
      setCart(payload.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible cargar el carrito.");
      setCart(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && cartId) void loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cartId]);

  async function updateQty(itemId: string, newQty: number) {
    if (!cartId) return;
    setMutating(itemId);
    try {
      await fetch("/api/store/cart/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemId, quantity: newQty }),
      });
      dispatchCartUpdated();
      await loadCart();
    } finally {
      setMutating(null);
    }
  }

  async function removeItem(itemId: string) {
    if (!cartId) return;
    setMutating(itemId);
    try {
      await fetch("/api/store/cart/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemId }),
      });
      dispatchCartUpdated();
      await loadCart();
    } finally {
      setMutating(null);
    }
  }

  const itemCount = useMemo(() => cart?.totals.itemsCount ?? 0, [cart]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          className="relative flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
          aria-label="Carrito de compras"
        >
          <ShoppingBag className="size-4" />
          <span className="hidden sm:inline">Carrito</span>
          {itemCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary-foreground text-[9px] font-bold text-primary">
              {itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle className="font-display text-lg font-extrabold">Tu carrito</SheetTitle>
          <SheetDescription>
            {ready
              ? cartId
                ? `${itemCount} ${itemCount === 1 ? "producto" : "productos"}`
                : "Aún no has agregado productos."
              : "Cargando..."}
          </SheetDescription>
        </SheetHeader>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!ready || loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : null}

          {ready && !loading && error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          {ready && !loading && !error && (!cartId || cart?.items.length === 0) ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <ShoppingBag className="size-12 text-muted-foreground/30" />
              <div>
                <p className="font-semibold">Tu carrito está vacío</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Agrega productos para comenzar.
                </p>
              </div>
              <Button asChild variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
                <Link href="/store">Explorar tienda</Link>
              </Button>
            </div>
          ) : null}

          {ready && !loading && !error && cart && cart.items.length > 0 ? (
            <AnimatePresence initial={false}>
              <div className="space-y-3">
                {cart.items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.05 }}
                  >
                    <CartItemRow
                      item={item}
                      loading={mutating === item.id}
                      onIncrement={() => void updateQty(item.id, Number(item.quantity) + 1)}
                      onDecrement={() =>
                        void updateQty(item.id, Math.max(1, Number(item.quantity) - 1))
                      }
                      onRemove={() => void removeItem(item.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          ) : null}
        </div>

        {/* Sticky footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <Price
                amount={cart.totals.subtotal}
                currency={cart.totals.currency}
                className="font-display text-lg font-extrabold"
              />
            </div>
            <Button
              asChild
              size="lg"
              className="w-full rounded-full shadow-lg shadow-primary/20"
              onClick={() => setOpen(false)}
            >
              <Link href={cartId ? `/checkout?cartId=${encodeURIComponent(cartId)}` : "/checkout"}>
                Ir a checkout
              </Link>
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Envío gratis · Pago seguro con Mercado Pago
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
