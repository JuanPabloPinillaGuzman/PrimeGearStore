"use client";

import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);

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

  async function importVariantsCsv() {
    if (!importFile) return;
    setImporting(true);
    setMessage(null);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", importFile);
      const response = await fetch("/api/admin/import/variants.csv", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as
        | { data: { created: number; updated: number; failed: number; errors: Array<{ row: number; message: string }> } }
        | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible importar variantes.");
      }
      setImportResult(payload.data);
      setMessage(`Importadas variantes: ${payload.data.created} creadas, ${payload.data.updated} actualizadas.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible importar variantes.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Admin: Variantes</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/api/admin/exports/variants.csv">Export variants</Link>
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            Import variants
          </Button>
        </div>
      </div>
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

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar variantes CSV</DialogTitle>
            <DialogDescription>
              Headers requeridos: variantId,productId,sku,name,attributes_json,isActive
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input type="file" accept=".csv,text/csv" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
            <div className="flex gap-2">
              <Button disabled={!importFile || importing} onClick={() => void importVariantsCsv()}>
                {importing ? "Importando..." : "Procesar CSV"}
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                Cerrar
              </Button>
            </div>
            {importResult ? (
              <div className="space-y-2 rounded-md border p-3 text-sm">
                <p>
                  Creadas: <b>{importResult.created}</b> · Actualizadas: <b>{importResult.updated}</b> · Fallidas:{" "}
                  <b>{importResult.failed}</b>
                </p>
                {importResult.errors.length > 0 ? (
                  <div className="max-h-56 overflow-auto rounded-md border bg-muted/20 p-2 text-xs">
                    {importResult.errors.slice(0, 50).map((rowError, index) => (
                      <p key={`${rowError.row}-${index}`}>
                        Fila {rowError.row}: {rowError.message}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
