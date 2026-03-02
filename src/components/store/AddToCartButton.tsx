"use client";

import { useEffect, useState } from "react";

import { dispatchCartUpdated, useCart } from "@/components/store/useCart";
import { Button } from "@/components/ui/button";
import { getErrorMessage, requestJson } from "@/lib/http/client";

type Props = {
  productId: number;
  variantId?: string | null;
  disabled?: boolean;
  disabledReason?: string | null;
};

type AddToCartResponse = {
  data: {
    cartId: string;
  };
};

type AddToCartButtonProps = Props & {
  onAdded?: () => void;
};

export function AddToCartButton({
  productId,
  variantId,
  disabled,
  disabledReason,
  onAdded,
}: AddToCartButtonProps) {
  const { sessionId, setCartId } = useCart();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleAdd() {
    if (disabled || !sessionId) return;
    setLoading(true);
    setToast(null);
    try {
      const payload = await requestJson<AddToCartResponse>("/api/store/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          productId,
          variantId: variantId ? Number(variantId) : undefined,
          quantity: 1,
        }),
      });
      setCartId(payload.data.cartId);
      dispatchCartUpdated();
      setToast({ type: "success", message: "Agregado al carrito." });
      onAdded?.();
    } catch (error) {
      setToast({
        type: "error",
        message: getErrorMessage(error, "No fue posible agregar al carrito."),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full rounded-full"
        size="lg"
        onClick={() => void handleAdd()}
        disabled={disabled || loading || !sessionId}
        aria-disabled={disabled || loading || !sessionId}
        data-testid="add-to-cart-button"
      >
        {loading ? "Agregando..." : "Agregar al carrito"}
      </Button>
      {disabledReason ? <p className="text-xs text-muted-foreground">{disabledReason}</p> : null}
      <div aria-live="polite" className="min-h-5">
        {toast ? (
          <p
            className={
              toast.type === "success"
                ? "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"
                : "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs text-red-700"
            }
            role="status"
          >
            {toast.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
