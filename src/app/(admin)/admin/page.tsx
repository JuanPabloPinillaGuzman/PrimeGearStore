"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type CreateProductResponse = {
  data: {
    id: number;
    name: string;
    sku: string | null;
    categoryId: number | null;
    isActive: boolean;
  };
};

export default function AdminProductsPage() {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const payload = {
        name,
        sku: sku || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
      };

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create product.");
      }

      const body = (await response.json()) as CreateProductResponse;
      setMessage(`Producto creado con ID ${body.data.id}.`);
      setName("");
      setSku("");
      setCategoryId("");
    } catch {
      setMessage("No fue posible crear el producto.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin: Crear Producto</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/orders">
          Pedidos
        </Link>
        <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/fulfillment">
          Fulfillment
        </Link>
        <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/purchases">
          Compras
        </Link>
        <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/inventory/stock">
          Stock
        </Link>
        <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/reports">
          Reportes
        </Link>
        <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/coupons">
          Cupones
        </Link>
        <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/variants">
          Variantes
        </Link>
      </div>
      <form className="space-y-4 rounded-lg border p-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="name">
            Nombre
          </label>
          <input
            id="name"
            className="w-full rounded-md border px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="sku">
            SKU (opcional)
          </label>
          <input
            id="sku"
            className="w-full rounded-md border px-3 py-2"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="categoryId">
            Category ID (opcional)
          </label>
          <input
            id="categoryId"
            className="w-full rounded-md border px-3 py-2"
            type="number"
            min={1}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-70"
        >
          {isSaving ? "Guardando..." : "Crear producto"}
        </button>
      </form>
      {message && <p className="mt-4 text-sm">{message}</p>}
    </main>
  );
}
