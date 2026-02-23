"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ValidateResponse = {
  data: {
    valid: boolean;
    discountAmount: string;
    newTotal: string;
    reason?: string;
  };
};

export function CouponBox({
  cartId,
  couponCode,
  onChangeCouponCode,
}: {
  cartId: string | null;
  couponCode: string;
  onChangeCouponCode: (coupon: string) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function validateCoupon() {
    if (!cartId || !couponCode.trim()) {
      setMessage("Ingresa un cartId y un cupón.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/store/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, code: couponCode.trim() }),
      });
      const payload = (await response.json()) as ValidateResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        const message = "error" in payload ? payload.error?.message : undefined;
        throw new Error(message ?? "No fue posible validar cupón.");
      }
      setMessage(
        payload.data.valid
          ? `Cupón válido. Descuento ${payload.data.discountAmount}. Nuevo total ${payload.data.newTotal}.`
          : `Cupón inválido: ${payload.data.reason ?? "No aplica"}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible validar cupón.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <p className="text-sm font-medium">Cupón</p>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="WELCOME10"
          value={couponCode}
          onChange={(e) => onChangeCouponCode(e.target.value.toUpperCase())}
          aria-label="Código de cupón"
        />
        <Button type="button" variant="outline" onClick={() => void validateCoupon()} disabled={loading}>
          {loading ? "..." : "Validar"}
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
