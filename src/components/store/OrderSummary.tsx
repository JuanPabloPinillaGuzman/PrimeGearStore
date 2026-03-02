"use client";

import { Price } from "@/components/store/Price";
import { Button } from "@/components/ui/button";

type Props = {
  subtotal: string;
  discount: string;
  total: string;
  currency?: string;
  loading?: boolean;
  error?: string | null;
  onCheckout: () => void;
};

export function OrderSummary({
  subtotal,
  discount,
  total,
  currency = "COP",
  loading,
  error,
  onCheckout,
}: Props) {
  return (
    <aside
      className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm lg:sticky lg:top-24"
      data-testid="checkout-summary"
    >
      <h2 className="text-base font-semibold tracking-tight">Resumen</h2>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <Price amount={subtotal} currency={currency} className="font-medium" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Descuento</span>
          <Price amount={discount} currency={currency} className="font-medium" />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Envío</span>
          <span className="font-medium">$0</span>
        </div>
        <div className="border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total</span>
            <Price amount={total} currency={currency} className="text-base font-semibold" />
          </div>
        </div>
      </div>
      {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</p> : null}
      <Button
        className="mt-4 w-full rounded-full"
        size="lg"
        onClick={onCheckout}
        disabled={loading}
        data-testid="checkout-continue-button"
      >
        {loading ? "Redirigiendo..." : "Continuar al pago"}
      </Button>
    </aside>
  );
}
