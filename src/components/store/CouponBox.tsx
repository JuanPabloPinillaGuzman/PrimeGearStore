"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage, requestJson } from "@/lib/http/client";

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
      setMessage("Ingresa un cartId y un cupon.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const payload = await requestJson<ValidateResponse>("/api/store/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, code: couponCode.trim() }),
      });
      setMessage(
        payload.data.valid
          ? `Cupon valido. Descuento ${payload.data.discountAmount}. Nuevo total ${payload.data.newTotal}.`
          : `Cupon invalido: ${payload.data.reason ?? "No aplica"}.`,
      );
    } catch (error) {
      setMessage(getErrorMessage(error, "No fue posible validar cupon."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
      <p className="text-sm font-medium">Cupon</p>
      <div className="mt-3 flex gap-2">
        <Input
          placeholder="WELCOME10"
          value={couponCode}
          onChange={(e) => onChangeCouponCode(e.target.value.toUpperCase())}
          aria-label="Codigo de cupon"
        />
        <Button type="button" variant="outline" onClick={() => void validateCoupon()} disabled={loading}>
          {loading ? "..." : "Validar"}
        </Button>
      </div>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
