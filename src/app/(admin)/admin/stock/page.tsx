"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Minus, Pencil, Plus, X } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LOW_STOCK_THRESHOLD = 5;

type ProductItem = {
  id: number;
  name: string;
  sku: string | null;
  categoryId: number | null;
  categoryName: string | null;
  isActive: boolean;
};

type StockItem = {
  productId: number;
  sku: string | null;
  name: string;
  branchId: number | null;
  stockOnHand: string;
};

type CategoryOption = { id: number; name: string };

type VariantItem = {
  id: string;
  sku: string | null;
  name: string;
  isActive: boolean;
};

type VariantPriceEntry = {
  priceListId: number;
  salePrice: string;
  currency: string;
  isDefaultPriceList: boolean;
};

type ProductRow = ProductItem & { stockOnHand: string };

function formatCOP(amount: string | number) {
  const num = Number(amount);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(num);
}

export default function AdminStockPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Inline editing
  const [editingName, setEditingName] = useState<{ id: number; value: string } | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

  // Adjust stock dialog
  const [adjustDialog, setAdjustDialog] = useState<{ product: ProductRow } | null>(null);
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustDir, setAdjustDir] = useState<"IN" | "OUT">("IN");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  // Prices dialog
  const [priceDialog, setPriceDialog] = useState<{ product: ProductRow } | null>(null);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [variantPrices, setVariantPrices] = useState<Record<string, VariantPriceEntry | null>>({});
  const [newPrices, setNewPrices] = useState<Record<string, string>>({});
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceSaving, setPriceSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, stockRes, catsRes] = await Promise.all([
        fetch("/api/admin/products?limit=100&offset=0"),
        fetch("/api/admin/inventory/stock?limit=100&offset=0"),
        fetch("/api/admin/products/categories"),
      ]);

      const [productsPayload, stockPayload, catsPayload] = await Promise.all([
        productsRes.json() as Promise<
          | { data: { items: ProductItem[] } }
          | { error?: { message?: string } }
        >,
        stockRes.json() as Promise<
          | { data: { items: StockItem[] } }
          | { error?: { message?: string } }
        >,
        catsRes.json() as Promise<
          | { data: { items: CategoryOption[] } }
          | { error?: { message?: string } }
        >,
      ]);

      if (!productsRes.ok || !("data" in productsPayload)) {
        const msg =
          "error" in productsPayload
            ? (productsPayload.error?.message ?? "Error al cargar productos.")
            : "Error al cargar productos.";
        throw new Error(msg);
      }
      if (!stockRes.ok || !("data" in stockPayload)) {
        const msg =
          "error" in stockPayload
            ? (stockPayload.error?.message ?? "Error al cargar stock.")
            : "Error al cargar stock.";
        throw new Error(msg);
      }

      if ("data" in catsPayload) {
        setCategories(catsPayload.data.items);
      }

      const stockMap = new Map<number, string>();
      for (const item of (stockPayload as { data: { items: StockItem[] } }).data.items) {
        stockMap.set(item.productId, item.stockOnHand);
      }

      const merged = (productsPayload as { data: { items: ProductItem[] } }).data.items.map(
        (p) => ({ ...p, stockOnHand: stockMap.get(p.id) ?? "0" }),
      );
      setRows(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  const filtered = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      row.name.toLowerCase().includes(q) ||
      (row.sku ?? "").toLowerCase().includes(q) ||
      (row.categoryName ?? "").toLowerCase().includes(q)
    );
  });

  // ── Name editing ──────────────────────────────────────────────────────────
  async function saveName(productId: number, name: string) {
    if (!name.trim()) return;
    setSavingField(`name-${productId}`);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) return;
      setRows((prev) => prev.map((r) => (r.id === productId ? { ...r, name: name.trim() } : r)));
      setEditingName(null);
    } finally {
      setSavingField(null);
    }
  }

  // ── Category editing ──────────────────────────────────────────────────────
  async function saveCategory(productId: number, categoryId: number | null) {
    setSavingField(`cat-${productId}`);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      if (!res.ok) return;
      const cat = categories.find((c) => c.id === categoryId);
      setRows((prev) =>
        prev.map((r) =>
          r.id === productId
            ? { ...r, categoryId, categoryName: cat?.name ?? null }
            : r,
        ),
      );
      setEditingCategory(null);
    } finally {
      setSavingField(null);
    }
  }

  // ── Adjust stock ──────────────────────────────────────────────────────────
  function openAdjust(product: ProductRow) {
    setAdjustDialog({ product });
    setAdjustQty("1");
    setAdjustDir("IN");
    setAdjustReason("");
  }

  async function confirmAdjust() {
    if (!adjustDialog) return;
    const qty = Number(adjustQty);
    if (!qty || qty <= 0) return;
    setAdjustSaving(true);
    try {
      await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustDialog.product.id,
          quantity: qty,
          direction: adjustDir,
          reason: adjustReason.trim() || undefined,
        }),
      });
      // Refresh stock for this product
      const params = new URLSearchParams({ limit: "10", offset: "0", search: adjustDialog.product.name });
      const stockRes = await fetch(`/api/admin/inventory/stock?${params.toString()}`);
      if (stockRes.ok) {
        const stockData = (await stockRes.json()) as { data?: { items?: StockItem[] } };
        const updated = stockData.data?.items?.find((i) => i.productId === adjustDialog.product.id);
        if (updated) {
          setRows((prev) =>
            prev.map((r) =>
              r.id === adjustDialog.product.id ? { ...r, stockOnHand: updated.stockOnHand } : r,
            ),
          );
        }
      }
      setAdjustDialog(null);
    } finally {
      setAdjustSaving(false);
    }
  }

  // ── Prices dialog ─────────────────────────────────────────────────────────
  async function openPriceDialog(product: ProductRow) {
    setPriceDialog({ product });
    setVariants([]);
    setVariantPrices({});
    setNewPrices({});
    setPriceLoading(true);
    try {
      const varRes = await fetch(`/api/admin/products/${product.id}/variants`);
      if (!varRes.ok) return;
      const varData = (await varRes.json()) as { data?: { items?: VariantItem[] } };
      const variantList = varData.data?.items ?? [];
      setVariants(variantList);

      const priceResults = await Promise.all(
        variantList.map(async (v) => {
          const res = await fetch(
            `/api/admin/products/${product.id}/variants/${v.id}/prices`,
          );
          if (!res.ok) return { id: v.id, price: null as VariantPriceEntry | null };
          const data = (await res.json()) as {
            data?: {
              items?: Array<{
                priceListId: number;
                salePrice: string;
                currency: string;
                isDefaultPriceList: boolean;
              }>;
            };
          };
          const defaultPrice = data.data?.items?.find((p) => p.isDefaultPriceList) ?? null;
          return { id: v.id, price: defaultPrice };
        }),
      );

      const priceMap: Record<string, VariantPriceEntry | null> = {};
      const initPrices: Record<string, string> = {};
      for (const r of priceResults) {
        priceMap[r.id] = r.price;
        initPrices[r.id] = r.price ? r.price.salePrice : "";
      }
      setVariantPrices(priceMap);
      setNewPrices(initPrices);
    } finally {
      setPriceLoading(false);
    }
  }

  async function savePrices() {
    if (!priceDialog) return;
    setPriceSaving(true);
    try {
      for (const variant of variants) {
        const raw = newPrices[variant.id];
        if (raw === undefined || raw === "") continue;
        const price = Number(raw);
        if (isNaN(price) || price < 0) continue;
        const priceListId = variantPrices[variant.id]?.priceListId ?? 1;
        await fetch(`/api/admin/variants/${variant.id}/prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceListId, salePrice: price, currency: "COP" }),
        });
      }
      setPriceDialog(null);
    } finally {
      setPriceSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Stock y precios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar por nombre, SKU o categoría…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            {search && (
              <Button variant="ghost" size="icon" onClick={() => setSearch("")}>
                <X className="size-4" />
              </Button>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <AdminTableSkeleton rows={8} columns={5} />
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <AdminEmptyState
                          title="Sin resultados"
                          description={
                            rows.length === 0
                              ? "No hay productos registrados."
                              : "Ningún producto coincide con la búsqueda."
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => {
                      const stock = Number(row.stockOnHand);
                      const lowStock = !isNaN(stock) && stock < LOW_STOCK_THRESHOLD;
                      const isEditingName = editingName?.id === row.id;
                      const isEditingCat = editingCategory === row.id;
                      const savingName = savingField === `name-${row.id}`;
                      const savingCat = savingField === `cat-${row.id}`;

                      return (
                        <TableRow key={row.id}>
                          {/* Name */}
                          <TableCell className="font-medium">
                            {isEditingName ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editingName.value}
                                  onChange={(e) =>
                                    setEditingName({ id: row.id, value: e.target.value })
                                  }
                                  className="h-7 w-44 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") void saveName(row.id, editingName.value);
                                    if (e.key === "Escape") setEditingName(null);
                                  }}
                                  autoFocus
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={() => void saveName(row.id, editingName.value)}
                                  disabled={savingName}
                                >
                                  {savingName ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Check className="size-3" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={() => setEditingName(null)}
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="group flex items-center gap-1">
                                <span>{row.name}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-5 opacity-0 transition-opacity group-hover:opacity-100"
                                  onClick={() => setEditingName({ id: row.id, value: row.name })}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            {isEditingCat ? (
                              <div className="flex items-center gap-1">
                                <Select
                                  className="h-7 w-40 text-sm"
                                  value={row.categoryId?.toString() ?? "none"}
                                  onChange={(e) =>
                                    void saveCategory(
                                      row.id,
                                      e.target.value === "none" ? null : Number(e.target.value),
                                    )
                                  }
                                >
                                  <option value="none">Sin categoría</option>
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.id.toString()}>
                                      {c.name}
                                    </option>
                                  ))}
                                </Select>
                                {savingCat && <Loader2 className="size-3 animate-spin" />}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={() => setEditingCategory(null)}
                                >
                                  <X className="size-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="group flex items-center gap-1">
                                <span className="text-muted-foreground">
                                  {row.categoryName ?? "Sin categoría"}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-5 opacity-0 transition-opacity group-hover:opacity-100"
                                  onClick={() => setEditingCategory(row.id)}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>

                          {/* SKU */}
                          <TableCell className="text-muted-foreground">
                            {row.sku ?? "—"}
                          </TableCell>

                          {/* Stock */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={lowStock ? "font-semibold text-destructive" : ""}>
                                {row.stockOnHand}
                              </span>
                              {lowStock && (
                                <Badge
                                  variant="destructive"
                                  className="px-1.5 py-0 text-[10px]"
                                >
                                  Bajo
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => openAdjust(row)}
                              >
                                Stock
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => void openPriceDialog(row)}
                              >
                                Precios
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Adjust Stock Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!adjustDialog} onOpenChange={(open) => !open && setAdjustDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
            <DialogDescription>{adjustDialog?.product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button
                variant={adjustDir === "IN" ? "default" : "outline"}
                className="flex-1 gap-1.5"
                onClick={() => setAdjustDir("IN")}
              >
                <Plus className="size-4" />
                Entrada
              </Button>
              <Button
                variant={adjustDir === "OUT" ? "default" : "outline"}
                className="flex-1 gap-1.5"
                onClick={() => setAdjustDir("OUT")}
              >
                <Minus className="size-4" />
                Salida
              </Button>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="adjust-qty" className="text-sm font-medium">Cantidad</label>
              <Input
                id="adjust-qty"
                type="number"
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="adjust-reason" className="text-sm font-medium">Motivo (opcional)</label>
              <Input
                id="adjust-reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="ej. Devolución, ajuste físico"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmAdjust()}
              disabled={adjustSaving || !adjustQty || Number(adjustQty) <= 0}
            >
              {adjustSaving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Prices Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!priceDialog} onOpenChange={(open) => !open && setPriceDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar precios</DialogTitle>
            <DialogDescription>{priceDialog?.product.name}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {priceLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : variants.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Este producto no tiene variantes configuradas.
              </p>
            ) : (
              <div className="space-y-3">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {v.name || v.sku || `Variante ${v.id}`}
                      </p>
                      {variantPrices[v.id] && (
                        <p className="text-xs text-muted-foreground">
                          Precio actual:{" "}
                          {formatCOP(variantPrices[v.id]!.salePrice)}
                        </p>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Nuevo precio"
                      value={newPrices[v.id] ?? ""}
                      onChange={(e) =>
                        setNewPrices((prev) => ({ ...prev, [v.id]: e.target.value }))
                      }
                      className="w-36 text-sm"
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Deja un campo vacío para no cambiar ese precio.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void savePrices()}
              disabled={priceSaving || priceLoading || variants.length === 0}
            >
              {priceSaving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
