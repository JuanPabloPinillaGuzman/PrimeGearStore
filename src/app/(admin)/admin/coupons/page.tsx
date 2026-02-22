"use client";

import { FormEvent, useEffect, useState } from "react";

type CouponItem = {
  id: string;
  code: string;
  type: string;
  value: string;
  currency: string;
  minSubtotal: string;
  redeemedCount: number;
  maxRedemptions: number | null;
  isActive: boolean;
};

export default function AdminCouponsPage() {
  const [items, setItems] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lookupCode, setLookupCode] = useState("");
  const [redemptions, setRedemptions] = useState<Array<{ id: string; orderNumber: string; redeemedAt: string }>>([]);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");

  async function loadCoupons() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/coupons");
      const payload = (await response.json()) as
        | { data: { items: CouponItem[] } }
        | { error: { message: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error.message : "No fue posible cargar cupones.");
      }
      setItems(payload.data.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cargar cupones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  async function createCoupon(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        type,
        value: Number(value),
        minSubtotal: minSubtotal ? Number(minSubtotal) : 0,
        currency: "COP",
      }),
    });
    const payload = (await response.json()) as
      | { data: { code: string } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible crear cupon.");
      return;
    }
    setMessage(`Cupon ${payload.data.code} creado.`);
    setCode("");
    setValue("");
    setMinSubtotal("");
    await loadCoupons();
  }

  async function toggleCoupon(item: CouponItem) {
    const response = await fetch(`/api/admin/coupons/${encodeURIComponent(item.code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    const payload = (await response.json()) as
      | { data: { code: string } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible actualizar.");
      return;
    }
    setMessage(`Cupon ${item.code} actualizado.`);
    await loadCoupons();
  }

  async function lookupRedemptions() {
    setMessage(null);
    const response = await fetch(
      `/api/admin/coupons/${encodeURIComponent(lookupCode)}/redemptions`,
    );
    const payload = (await response.json()) as
      | { data: { items: Array<{ id: string; orderNumber: string; redeemedAt: string }> } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible consultar redenciones.");
      return;
    }
    setRedemptions(payload.data.items);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin: Cupones</h1>
      {message && <p className="mb-3 text-sm">{message}</p>}

      <section className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Crear cupon</h2>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={createCoupon}>
          <input className="rounded-md border px-3 py-2" placeholder="CODE10" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
          <select className="rounded-md border px-3 py-2" value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}>
            <option value="PERCENT">PERCENT</option>
            <option value="FIXED">FIXED</option>
          </select>
          <input className="rounded-md border px-3 py-2" type="number" step="0.01" placeholder="10" value={value} onChange={(e) => setValue(e.target.value)} required />
          <input className="rounded-md border px-3 py-2" type="number" step="0.01" placeholder="Min subtotal" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} />
          <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground md:col-span-4" type="submit">
            Crear
          </button>
        </form>
      </section>

      <section className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Consultar redenciones</h2>
        <div className="flex gap-2">
          <input className="w-full max-w-xs rounded-md border px-3 py-2" placeholder="Coupon code" value={lookupCode} onChange={(e) => setLookupCode(e.target.value.toUpperCase())} />
          <button className="rounded-md border px-4 py-2" type="button" onClick={() => void lookupRedemptions()}>
            Ver redenciones
          </button>
        </div>
        <div className="mt-3 space-y-1">
          {redemptions.map((r) => (
            <p key={r.id} className="text-sm">
              {r.orderNumber} | {new Date(r.redeemedAt).toLocaleString()}
            </p>
          ))}
          {lookupCode && redemptions.length === 0 && <p className="text-sm text-muted-foreground">Sin redenciones.</p>}
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Cupones</h2>
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{item.code}</p>
                <p className="text-muted-foreground">
                  {item.type} {item.value} {item.type === "FIXED" ? item.currency : "%"} | min {item.minSubtotal} | redenciones {item.redeemedCount}/{item.maxRedemptions ?? "∞"}
                </p>
              </div>
              <button className="rounded-md border px-3 py-2" type="button" onClick={() => void toggleCoupon(item)}>
                {item.isActive ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">Sin cupones.</p>}
        </div>
      </section>
    </main>
  );
}

