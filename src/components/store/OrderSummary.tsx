"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";

import { Price } from "@/components/store/Price";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
      className="surface-elevated rounded-3xl border border-border/60 p-6 shadow-lg lg:sticky lg:top-24"
      data-testid="checkout-summary"
    >
      <h2 className="font-display text-lg font-extrabold tracking-tight">Resumen del pedido</h2>

      <div className="mt-5 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <Price amount={subtotal} currency={currency} className="font-semibold" />
        </div>
        {Number(discount) > 0 && (
          <div className="flex items-center justify-between text-emerald-600">
            <span>Descuento</span>
            <Price amount={discount} currency={currency} className="font-semibold" />
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Envío</span>
          <span className="font-semibold text-emerald-600">Gratis</span>
        </div>

        <Separator />

        <div className="flex items-center justify-between pt-1">
          <span className="font-semibold">Total</span>
          <Price
            amount={total}
            currency={currency}
            className="font-display text-2xl font-extrabold tracking-tight"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}

      <Button
        size="lg"
        className="mt-5 w-full rounded-full shadow-lg shadow-primary/20"
        onClick={onCheckout}
        disabled={loading}
        data-testid="checkout-continue-button"
      >
        {loading ? (
          "Redirigiendo..."
        ) : (
          <>
            Continuar al pago
            <ArrowRight className="ml-1.5 size-4" />
          </>
        )}
      </Button>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-emerald-500" />
        Pago seguro con Mercado Pago
      </div>
    </aside>
  );
}
