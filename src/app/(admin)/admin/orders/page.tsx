"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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
    pagination: {
      limit: number;
      offset: number;
      count: number;
    };
  };
};

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<OrdersListResponse["data"]["items"]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: "0",
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }

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
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onReconcile(orderNumber: string) {
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/orders/${encodeURIComponent(orderNumber)}/reconcile-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const payload = (await response.json()) as
        | { data: { message: string } }
        | { error: { message: string } };

      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error.message : "No fue posible reconciliar.");
      }

      setMessage(`Pedido ${orderNumber}: ${payload.data.message}`);
      await loadOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible reconciliar.");
    }
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadOrders();
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin: Pedidos</h1>
      <div className="mb-4">
        <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/fulfillment">
          Ir a Fulfillment
        </Link>
      </div>
      <form className="mb-4 flex gap-2" onSubmit={onSearch}>
        <input
          className="w-full max-w-xs rounded-md border px-3 py-2"
          placeholder="Buscar por order number"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" type="submit">
          Buscar
        </button>
      </form>
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
                <td className="px-3 py-2">
                  {item.saleId ? `#${item.saleId}` : item.converted ? "Yes" : "No"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <Link className="rounded-md border px-2 py-1" href={`/admin/orders/${item.orderNumber}`}>
                      Ver
                    </Link>
                    <button
                      className="rounded-md border px-2 py-1"
                      onClick={() => void onReconcile(item.orderNumber)}
                      type="button"
                    >
                      Reconciliar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={6}>
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
