"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FulfillmentStatus = "PAID" | "PACKING" | "SHIPPED";

type OrdersListResponse = {
  data: {
    items: Array<{
      orderNumber: string;
      status: string;
      total: string;
      createdAt: string;
      paymentStatus: string | null;
      saleId: string | null;
      converted: boolean;
    }>;
  };
};

export default function AdminFulfillmentPage() {
  const [status, setStatus] = useState<FulfillmentStatus>("PAID");
  const [items, setItems] = useState<OrdersListResponse["data"]["items"]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadOrders(nextStatus: FulfillmentStatus = status) {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        limit: "30",
        offset: "0",
        status: nextStatus,
      });
      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      const payload = (await response.json()) as OrdersListResponse | { error: { message: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error.message : "No fue posible cargar pedidos.");
      }
      setItems(payload.data.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cargar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function markStatus(orderNumber: string, nextStatus: "PACKING" | "SHIPPED" | "DELIVERED") {
    setMessage(null);
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = (await response.json()) as
      | { data: { status: string } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible actualizar estado.");
      return;
    }
    setMessage(`Pedido ${orderNumber} actualizado a ${payload.data.status}.`);
    await loadOrders(status);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin: Fulfillment</h1>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={`rounded-md border px-3 py-2 text-sm ${status === "PAID" ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => setStatus("PAID")}
          type="button"
        >
          PAID
        </button>
        <button
          className={`rounded-md border px-3 py-2 text-sm ${status === "PACKING" ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => setStatus("PACKING")}
          type="button"
        >
          PACKING
        </button>
        <button
          className={`rounded-md border px-3 py-2 text-sm ${status === "SHIPPED" ? "bg-primary text-primary-foreground" : ""}`}
          onClick={() => setStatus("SHIPPED")}
          type="button"
        >
          SHIPPED
        </button>
      </div>
      {message && <p className="mb-3 text-sm">{message}</p>}
      {loading && <p className="mb-3 text-sm text-muted-foreground">Cargando...</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Total</th>
              <th className="px-3 py-2 text-left">Payment</th>
              <th className="px-3 py-2 text-left">Sale</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.orderNumber} className="border-t">
                <td className="px-3 py-2">{item.orderNumber}</td>
                <td className="px-3 py-2">{item.status}</td>
                <td className="px-3 py-2">{item.total}</td>
                <td className="px-3 py-2">{item.paymentStatus ?? "N/A"}</td>
                <td className="px-3 py-2">{item.saleId ? `#${item.saleId}` : "No"}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {item.status === "PAID" && (
                      <button
                        className="rounded-md border px-2 py-1"
                        onClick={() => void markStatus(item.orderNumber, "PACKING")}
                        type="button"
                      >
                        Marcar PACKING
                      </button>
                    )}
                    {item.status === "PACKING" && (
                      <button
                        className="rounded-md border px-2 py-1"
                        onClick={() => void markStatus(item.orderNumber, "SHIPPED")}
                        type="button"
                      >
                        Marcar SHIPPED
                      </button>
                    )}
                    {item.status === "SHIPPED" && (
                      <button
                        className="rounded-md border px-2 py-1"
                        onClick={() => void markStatus(item.orderNumber, "DELIVERED")}
                        type="button"
                      >
                        Marcar DELIVERED
                      </button>
                    )}
                    <Link className="rounded-md border px-2 py-1" href={`/admin/orders/${item.orderNumber}`}>
                      Editar envio
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={6}>
                  Sin pedidos para este estado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
