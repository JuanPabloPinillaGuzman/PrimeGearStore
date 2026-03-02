"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { OrderTimeline } from "@/components/store/OrderTimeline";
import { Price } from "@/components/store/Price";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type OrderResponse = {
  data: {
    orderId: string;
    orderNumber: string;
    status: string;
    currency: string;
    totals: {
      subtotal: string;
      discountTotal: string;
      taxTotal: string;
      shippingTotal: string;
      total: string;
    };
    reservations: Array<{
      id: string;
      status: string;
      expiresAt: string;
    }>;
    shipment: {
      id: string;
      status: string;
      carrier: string | null;
      service: string | null;
      trackingNumber: string | null;
      shippedAt: string | null;
      deliveredAt: string | null;
    } | null;
    payment: {
      provider: string;
      status: string;
      amount: string;
      providerRef: string | null;
      updatedAt: string;
    } | null;
  };
};

function formatRemaining(ms: number) {
  if (ms <= 0) return "00:00";
  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function OrderPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber;
  const [order, setOrder] = useState<OrderResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!orderNumber) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/store/orders/${orderNumber}`, { cache: "no-store" });
        const payload = (await response.json()) as OrderResponse | { error?: { message?: string } };
        if (!response.ok || !("data" in payload)) {
          throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar la orden.");
        }
        if (!cancelled) setOrder(payload.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "No fue posible cargar la orden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  const nextExpiry = useMemo(() => {
    if (!order) return null;
    const active = order.reservations
      .filter((reservation) => reservation.status === "ACTIVE")
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())[0];
    return active ? new Date(active.expiresAt).getTime() : null;
  }, [order]);

  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Order</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{orderNumber}</h1>
            {order ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Estado actual: <span className="font-medium text-foreground">{order.status}</span>
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/orders/${orderNumber}/receipt`}>Ver recibo</Link>
            </Button>
            <Button asChild>
              <Link href="/store">Seguir comprando</Link>
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Skeleton className="h-60 rounded-2xl" />
          <Skeleton className="h-60 rounded-2xl" />
        </div>
      ) : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {order ? (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
              <OrderTimeline currentStatus={order.status} />
              {nextExpiry ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Reserva expira en <span className="font-medium text-foreground">{formatRemaining(nextExpiry - now)}</span>
                </p>
              ) : null}
            </section>

            <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight">Pago</h2>
              {order.payment ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p>
                    Estado: <strong>{order.payment.status}</strong>
                  </p>
                  <p>
                    Proveedor: <strong>{order.payment.provider}</strong>
                  </p>
                  <p>
                    Monto: <strong><Price amount={order.payment.amount} currency={order.currency} /></strong>
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Aún sin registro de pago.</p>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight">Resumen del pedido</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><Price amount={order.totals.subtotal} currency={order.currency} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><Price amount={order.totals.discountTotal} currency={order.currency} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Envío</span><Price amount={order.totals.shippingTotal} currency={order.currency} /></div>
                <div className="border-t border-border/60 pt-2">
                  <div className="flex justify-between font-semibold"><span>Total</span><Price amount={order.totals.total} currency={order.currency} /></div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
              <h2 className="text-base font-semibold tracking-tight">Envío / tracking</h2>
              {order.shipment ? (
                <div className="mt-3 space-y-2 text-sm">
                  <p>Estado: <strong>{order.shipment.status}</strong></p>
                  <p>Carrier: <strong>{order.shipment.carrier ?? "N/A"}</strong></p>
                  <p>Guía: <strong>{order.shipment.trackingNumber ?? "N/A"}</strong></p>
                  {order.shipment.trackingNumber ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard.writeText(order.shipment?.trackingNumber ?? "");
                          setCopyMessage("Guía copiada.");
                        }}
                      >
                        Copiar guía
                      </Button>
                      {copyMessage ? <p className="text-xs text-muted-foreground">{copyMessage}</p> : null}
                    </>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Todavía no hay envío registrado.</p>
              )}
            </section>
          </div>
        </div>
      ) : null}
    </main>
  );
}
