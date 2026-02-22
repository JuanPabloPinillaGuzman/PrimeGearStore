"use client";

import { FormEvent, useState } from "react";

type PurchaseResponse = {
  data: {
    purchaseId: string;
    totals: {
      total: string;
    };
  };
};

export default function AdminPurchasesPage() {
  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierId: Number(supplierId),
          branchId: branchId ? Number(branchId) : undefined,
          currency: "COP",
          items: [
            {
              productId: Number(productId),
              quantity: Number(quantity),
              unitCost: Number(unitCost),
            },
          ],
        }),
      });

      const payload = (await response.json()) as PurchaseResponse | { error: { message: string } };
      if (!response.ok) {
        throw new Error("error" in payload ? payload.error.message : "No fue posible registrar compra.");
      }

      if (!("data" in payload)) {
        throw new Error("No fue posible registrar compra.");
      }

      setMessage(`Compra ${payload.data.purchaseId} creada. Total: ${payload.data.totals.total}`);
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : "No fue posible registrar compra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin: Compras</h1>
      <form className="space-y-4 rounded-lg border p-4" onSubmit={onSubmit}>
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Supplier ID"
          type="number"
          min={1}
          required
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Branch ID (opcional)"
          type="number"
          min={1}
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Product ID"
          type="number"
          min={1}
          required
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Quantity"
          type="number"
          min={0.001}
          step={0.001}
          required
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Unit cost"
          type="number"
          min={0}
          step={0.01}
          required
          value={unitCost}
          onChange={(event) => setUnitCost(event.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-70"
        >
          {loading ? "Guardando..." : "Registrar compra"}
        </button>
      </form>
      {message && <p className="mt-4 text-sm">{message}</p>}
    </main>
  );
}
