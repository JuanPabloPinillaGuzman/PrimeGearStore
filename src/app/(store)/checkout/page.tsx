"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CheckoutResponse = {
  data: {
    orderNumber: string;
    couponCode?: string | null;
  };
};

export default function CheckoutPage() {
  const router = useRouter();
  const [cartId, setCartId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [notes, setNotes] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("cartId");
    if (value) {
      setCartId((prev) => prev || value);
    }
  }, []);

  async function validateCoupon() {
    setCouponMessage(null);
    if (!cartId || !couponCode.trim()) {
      setCouponMessage("Ingresa cartId y couponCode.");
      return;
    }

    const response = await fetch("/api/store/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cartId,
        code: couponCode.trim(),
      }),
    });
    const payload = (await response.json()) as
      | { data: { valid: boolean; discountAmount: string; newTotal: string; reason?: string } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setCouponMessage("error" in payload ? payload.error.message : "No fue posible validar cupón.");
      return;
    }
    setCouponMessage(
      payload.data.valid
        ? `Cupón válido. Descuento: ${payload.data.discountAmount}. Nuevo total: ${payload.data.newTotal}`
        : `Cupón inválido: ${payload.data.reason ?? "No aplica"}`,
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cartId,
          customerId: customerId ? Number(customerId) : undefined,
          branchId: branchId ? Number(branchId) : undefined,
          notes: notes || undefined,
          couponCode: couponCode.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as CheckoutResponse | { error: { message: string } };
      if (!response.ok) {
        const message = "error" in payload ? payload.error.message : "Checkout failed.";
        throw new Error(message);
      }

      if (!("data" in payload)) {
        throw new Error("Checkout failed.");
      }

      router.push(`/orders/${payload.data.orderNumber}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Checkout failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Checkout</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="cartId">
            Cart ID (UUID)
          </label>
          <input
            id="cartId"
            className="w-full rounded-md border px-3 py-2"
            required
            value={cartId}
            onChange={(event) => setCartId(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="customerId">
            Customer ID (opcional)
          </label>
          <input
            id="customerId"
            type="number"
            min={1}
            className="w-full rounded-md border px-3 py-2"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="branchId">
            Branch ID (opcional)
          </label>
          <input
            id="branchId"
            type="number"
            min={1}
            className="w-full rounded-md border px-3 py-2"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="couponCode">
            Cupón (opcional)
          </label>
          <div className="flex gap-2">
            <input
              id="couponCode"
              className="w-full rounded-md border px-3 py-2"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
            />
            <button className="rounded-md border px-3 py-2" type="button" onClick={() => void validateCoupon()}>
              Validar
            </button>
          </div>
          {couponMessage && <p className="text-xs text-muted-foreground">{couponMessage}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="notes">
            Notas (opcional)
          </label>
          <textarea
            id="notes"
            className="w-full rounded-md border px-3 py-2"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-70"
        >
          {loading ? "Procesando..." : "Confirmar checkout"}
        </button>
      </form>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
