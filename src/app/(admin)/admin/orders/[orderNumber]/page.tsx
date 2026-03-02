"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type OrderDetailResponse = {
  data: {
    orderNumber: string;
    status: string;
    total: string;
    currency: string;
    createdAt: string;
    items: Array<{
      id: string;
      productId: number;
      quantity: string;
      unitPriceSnapshot: string;
      lineTotal: string;
    }>;
    reservations: Array<{
      id: string;
      productId: number;
      status: string;
      quantity: string;
      expiresAt: string;
    }>;
    payments: Array<{
      id: string;
      provider: string;
      providerRef: string | null;
      status: string;
      amount: string;
      createdAt: string;
    }>;
    shipments: Array<{
      id: string;
      status: string;
      carrier: string | null;
      service: string | null;
      trackingNumber: string | null;
      shippedAt: string | null;
      deliveredAt: string | null;
      createdAt: string;
    }>;
    sale: {
      saleId: string;
      status: string;
      total: string;
    } | null;
  };
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber;
  const [detail, setDetail] = useState<OrderDetailResponse["data"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [service, setService] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");

  async function loadDetail() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}`);
      const payload = (await response.json()) as
        | OrderDetailResponse
        | { error: { message: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error.message : "No fue posible cargar orden.");
      }
      setDetail(payload.data);
      const latestShipment = payload.data.shipments[0];
      setCarrier(latestShipment?.carrier ?? "");
      setService(latestShipment?.service ?? "");
      setTrackingNumber(latestShipment?.trackingNumber ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cargar orden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  async function reconcile() {
    setMessage(null);
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/reconcile-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = (await response.json()) as
      | { data: { message: string } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible reconciliar.");
      return;
    }
    setMessage(payload.data.message);
    await loadDetail();
  }

  async function cancelOrder() {
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/cancel`, {
      method: "POST",
    });
    const payload = (await response.json()) as
      | { data: { status: string } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible cancelar.");
      return;
    }
    setMessage(`Pedido cancelado: ${payload.data.status}`);
    await loadDetail();
  }

  async function markStatus(status: "PACKING" | "SHIPPED" | "DELIVERED") {
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const payload = (await response.json()) as
      | { data: { status: string } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible actualizar estado.");
      return;
    }
    setMessage(`Estado actualizado a ${payload.data.status}.`);
    await loadDetail();
  }

  async function saveShipment(isUpdate: boolean) {
    const method = isUpdate ? "PATCH" : "POST";
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/shipment`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carrier: carrier || undefined,
        service: service || undefined,
        trackingNumber: trackingNumber || undefined,
      }),
    });
    const payload = (await response.json()) as
      | { data: { status: string } }
      | { error: { message: string } };
    if (!response.ok) {
      setMessage("error" in payload ? payload.error.message : "No fue posible guardar shipment.");
      return;
    }
    setMessage("Shipment guardado.");
    await loadDetail();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-4 text-3xl font-semibold">Admin: Orden {orderNumber}</h1>
      {loading && <p className="mb-3 text-sm text-muted-foreground">Cargando...</p>}
      {message && <p className="mb-3 text-sm">{message}</p>}
      {detail && (
        <div className="space-y-6">
          <section className="rounded-lg border p-4">
            <p>Status: <strong>{detail.status}</strong></p>
            <p>Total: <strong>{detail.currency} {detail.total}</strong></p>
            <p>Sale: <strong>{detail.sale ? `#${detail.sale.saleId}` : "No"}</strong></p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-md border px-3 py-2" onClick={() => void reconcile()} type="button">
                Reconciliar pago
              </button>
              <button className="rounded-md border px-3 py-2" onClick={() => void cancelOrder()} type="button">
                Cancelar pedido
              </button>
              <button className="rounded-md border px-3 py-2" onClick={() => void markStatus("PACKING")} type="button">
                Marcar PACKING
              </button>
              <button className="rounded-md border px-3 py-2" onClick={() => void markStatus("SHIPPED")} type="button">
                Marcar SHIPPED
              </button>
              <button className="rounded-md border px-3 py-2" onClick={() => void markStatus("DELIVERED")} type="button">
                Marcar DELIVERED
              </button>
            </div>
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-2 text-lg font-medium">Items</h2>
            {detail.items.map((item) => (
              <p key={item.id} className="text-sm">
                Product {item.productId} | qty {item.quantity} | unit {item.unitPriceSnapshot}
              </p>
            ))}
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-2 text-lg font-medium">Reservas</h2>
            {detail.reservations.map((reservation) => (
              <p key={reservation.id} className="text-sm">
                Product {reservation.productId} | {reservation.status} | qty {reservation.quantity}
              </p>
            ))}
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-2 text-lg font-medium">Pagos</h2>
            {detail.payments.map((payment) => (
              <p key={payment.id} className="text-sm">
                {payment.provider} | {payment.status} | {payment.amount} | ref {payment.providerRef ?? "N/A"}
              </p>
            ))}
            {detail.payments.length === 0 && <p className="text-sm text-muted-foreground">Sin pagos.</p>}
          </section>

          <section className="rounded-lg border p-4">
            <h2 className="mb-2 text-lg font-medium">Shipment</h2>
            <div className="grid gap-2 md:grid-cols-3">
              <input
                className="rounded-md border px-3 py-2"
                placeholder="Carrier"
                value={carrier}
                onChange={(event) => setCarrier(event.target.value)}
              />
              <input
                className="rounded-md border px-3 py-2"
                placeholder="Service"
                value={service}
                onChange={(event) => setService(event.target.value)}
              />
              <input
                className="rounded-md border px-3 py-2"
                placeholder="Tracking number"
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button className="rounded-md border px-3 py-2" type="button" onClick={() => void saveShipment(false)}>
                Crear/Upsert envío
              </button>
              <button className="rounded-md border px-3 py-2" type="button" onClick={() => void saveShipment(true)}>
                Actualizar envío
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
