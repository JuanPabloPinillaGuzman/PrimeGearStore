"use client";

import { FormEvent, useState } from "react";

type StockResponse = {
  data: {
    items: Array<{
      productId: number;
      sku: string | null;
      name: string;
      branchId: number | null;
      stockOnHand: string;
    }>;
  };
};

export default function AdminInventoryStockPage() {
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [items, setItems] = useState<StockResponse["data"]["items"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadStock(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (branchId.trim()) params.set("branchId", branchId.trim());
      params.set("limit", "50");
      params.set("offset", "0");

      const response = await fetch(`/api/admin/inventory/stock?${params.toString()}`);
      const payload = (await response.json()) as StockResponse | { error: { message: string } };
      if (!response.ok) {
        throw new Error("error" in payload ? payload.error.message : "No fue posible cargar stock.");
      }

      if (!("data" in payload)) {
        throw new Error("No fue posible cargar stock.");
      }

      setItems(payload.data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar stock.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin: Stock</h1>
      <form className="mb-6 flex flex-wrap gap-2" onSubmit={loadStock}>
        <input
          className="rounded-md border px-3 py-2"
          placeholder="Buscar nombre o SKU"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <input
          className="rounded-md border px-3 py-2"
          placeholder="Branch ID"
          type="number"
          min={1}
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
        />
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" type="submit">
          {loading ? "Consultando..." : "Consultar"}
        </button>
      </form>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left">Producto</th>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Branch</th>
              <th className="px-3 py-2 text-left">Stock</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.productId}-${item.branchId ?? "global"}`} className="border-t">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2">{item.sku ?? "N/A"}</td>
                <td className="px-3 py-2">{item.branchId ?? "GLOBAL"}</td>
                <td className="px-3 py-2">{item.stockOnHand}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={4}>
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
