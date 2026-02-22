"use client";

import { useState } from "react";

type VariantItem = {
  id: string;
  productId: number;
  sku: string | null;
  name: string;
  isActive: boolean;
};

type VariantStockItem = {
  variantId: string;
  productId: number;
  productName: string;
  productSku: string | null;
  variantName: string;
  variantSku: string | null;
  branchId: number | null;
  stockOnHand: string;
};

export default function AdminVariantsPage() {
  const [productId, setProductId] = useState("");
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [stockRows, setStockRows] = useState<VariantStockItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantSku, setNewVariantSku] = useState("");
  const [priceVariantId, setPriceVariantId] = useState("");
  const [priceListId, setPriceListId] = useState("1");
  const [salePrice, setSalePrice] = useState("");

  async function loadVariants() {
    setMessage(null);
    if (!productId) return;
    const response = await fetch(`/api/admin/products/${productId}/variants`);
    const payload = (await response.json()) as
      | { data: { items: VariantItem[] } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible cargar variantes.");
      return;
    }
    setVariants(payload.data.items);
  }

  async function createVariant() {
    setMessage(null);
    if (!productId) return;
    const response = await fetch(`/api/admin/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: newVariantSku || undefined,
        name: newVariantName,
        attributes: {},
      }),
    });
    const payload = (await response.json()) as
      | { data: { id: string } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible crear variante.");
      return;
    }
    setMessage("Variante creada.");
    setNewVariantName("");
    setNewVariantSku("");
    await loadVariants();
  }

  async function createPrice() {
    setMessage(null);
    if (!priceVariantId) return;
    const response = await fetch(`/api/admin/variants/${priceVariantId}/prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceListId: Number(priceListId),
        salePrice: Number(salePrice),
        currency: "COP",
      }),
    });
    const payload = (await response.json()) as
      | { data: { id: string } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible crear precio.");
      return;
    }
    setMessage("Precio de variante creado.");
    setSalePrice("");
  }

  async function loadStock() {
    const response = await fetch("/api/admin/variants/stock?limit=50&offset=0");
    const payload = (await response.json()) as
      | { data: { items: VariantStockItem[] } }
      | { error: { message: string } };
    if (!response.ok || !("data" in payload)) {
      setMessage("error" in payload ? payload.error.message : "No fue posible cargar stock.");
      return;
    }
    setStockRows(payload.data.items);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-3xl font-semibold">Admin: Variantes</h1>
      {message && <p className="mb-3 text-sm">{message}</p>}

      <section className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Panel variantes por producto</h2>
        <div className="mb-3 flex gap-2">
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Product ID"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
          <button className="rounded-md border px-3 py-2" type="button" onClick={() => void loadVariants()}>
            Cargar variantes
          </button>
        </div>

        <div className="mb-4 grid gap-2 md:grid-cols-3">
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Nombre variante (Talla M / Negro)"
            value={newVariantName}
            onChange={(e) => setNewVariantName(e.target.value)}
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="SKU variante"
            value={newVariantSku}
            onChange={(e) => setNewVariantSku(e.target.value)}
          />
          <button className="rounded-md border px-3 py-2" type="button" onClick={() => void createVariant()}>
            Crear variante
          </button>
        </div>

        <div className="space-y-2">
          {variants.map((variant) => (
            <div key={variant.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{variant.name}</p>
              <p className="text-muted-foreground">
                ID {variant.id} | SKU {variant.sku ?? "N/A"} | {variant.isActive ? "ACTIVA" : "INACTIVA"}
              </p>
            </div>
          ))}
          {variants.length === 0 && <p className="text-sm text-muted-foreground">Sin variantes cargadas.</p>}
        </div>
      </section>

      <section className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 text-lg font-medium">Asignar precio a variante</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <input className="rounded-md border px-3 py-2" placeholder="Variant ID" value={priceVariantId} onChange={(e) => setPriceVariantId(e.target.value)} />
          <input className="rounded-md border px-3 py-2" placeholder="Price List ID" value={priceListId} onChange={(e) => setPriceListId(e.target.value)} />
          <input className="rounded-md border px-3 py-2" placeholder="Precio" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          <button className="rounded-md border px-3 py-2" type="button" onClick={() => void createPrice()}>
            Guardar precio
          </button>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Stock por variante</h2>
          <button className="rounded-md border px-3 py-2" type="button" onClick={() => void loadStock()}>
            Cargar stock
          </button>
        </div>
        <div className="space-y-2">
          {stockRows.map((row) => (
            <div key={`${row.variantId}-${row.branchId ?? "global"}`} className="rounded-md border p-3 text-sm">
              <p className="font-medium">{row.productName} / {row.variantName}</p>
              <p className="text-muted-foreground">
                Variant {row.variantId} | Branch {row.branchId ?? "GLOBAL"} | Stock {row.stockOnHand}
              </p>
            </div>
          ))}
          {stockRows.length === 0 && <p className="text-sm text-muted-foreground">Sin datos de stock.</p>}
        </div>
      </section>
    </main>
  );
}

