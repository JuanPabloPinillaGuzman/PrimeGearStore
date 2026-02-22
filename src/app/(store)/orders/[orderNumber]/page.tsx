"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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
    timeline: Array<{
      status: "PAID" | "PACKING" | "SHIPPED" | "DELIVERED";
      reached: boolean;
    }>;
  };
};

function formatRemaining(ms: number) {
  if (ms <= 0) {
    return "00:00";
  }

  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function OrderPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber;
  const [order, setOrder] = useState<OrderResponse["data"] | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/store/orders/${orderNumber}`);
        const payload = (await response.json()) as
          | OrderResponse
          | { error: { message: string } };

        if (!response.ok) {
          const message = "error" in payload ? payload.error.message : "Order not found.";
          throw new Error(message);
        }

        if (!("data" in payload)) {
          throw new Error("Order not found.");
        }

        setOrder(payload.data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Order not found.");
      } finally {
        setLoading(false);
      }
    }

    if (orderNumber) {
      void loadOrder();
    }
  }, [orderNumber]);

  const nextExpiry = useMemo(() => {
    if (!order) {
      return null;
    }

    const activeReservations = order.reservations.filter((reservation) => reservation.status === "ACTIVE");
    if (activeReservations.length === 0) {
      return null;
    }

    const first = [...activeReservations].sort(
      (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
    )[0];

    return new Date(first.expiresAt).getTime();
  }, [order]);

  const remainingText = nextExpiry ? formatRemaining(nextExpiry - now) : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 text-3xl font-semibold">Order {orderNumber}</h1>
      <div className="mb-3">
        <Link className="rounded-md border px-3 py-2 text-sm" href={`/orders/${orderNumber}/receipt`}>
          Ver recibo imprimible
        </Link>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Cargando orden...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {order && (
        <div className="space-y-3 rounded-lg border p-4">
          <p>
            Estado: <strong>{order.status}</strong>
          </p>
          <p>
            Total: <strong>{order.currency} {order.totals.total}</strong>
          </p>
          <p>
            Reservas activas:{" "}
            <strong>{order.reservations.filter((reservation) => reservation.status === "ACTIVE").length}</strong>
          </p>
          <p>
            Expira en: <strong>{remainingText ?? "N/A"}</strong>
          </p>
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">Tracking</p>
            <p className="text-sm">
              Carrier: <strong>{order.shipment?.carrier ?? "N/A"}</strong>
            </p>
            <p className="text-sm">
              Guia: <strong>{order.shipment?.trackingNumber ?? "N/A"}</strong>
            </p>
            {order.shipment?.trackingNumber && (
              <button
                className="mt-2 rounded-md border px-2 py-1 text-sm"
                onClick={() => {
                  void navigator.clipboard.writeText(order.shipment?.trackingNumber ?? "");
                  setCopyMessage("Guia copiada.");
                }}
                type="button"
              >
                Copiar guia
              </button>
            )}
            {copyMessage && <p className="mt-1 text-xs text-muted-foreground">{copyMessage}</p>}
          </div>
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">Timeline</p>
            <div className="flex flex-wrap gap-2">
              {order.timeline.map((step) => (
                <span
                  key={step.status}
                  className={`rounded-full border px-3 py-1 text-xs ${step.reached ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {step.status}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
