"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { formatDateTime } from "@/components/admin/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProductRow = {
  id: number;
  name: string;
  sku: string | null;
  slug: string | null;
  isActive: boolean;
  categoryId: number | null;
  categoryName: string | null;
  createdAt: string;
};

type ProductsListResponse = {
  data: {
    items: ProductRow[];
    pagination: { limit: number; offset: number; count: number };
  };
};

type CreateProductResponse = {
  data: {
    id: number;
    name: string;
    sku: string | null;
    categoryId: number | null;
    isActive: boolean;
  };
};

type CategoriesResponse = {
  data: { items: Array<{ id: number; name: string }> };
};

type BulkResponse = {
  data: { updatedCount: number };
};

type ImportResponse = {
  data: {
    created: number;
    updated: number;
    failed: number;
    errors: Array<{ row: number; message: string }>;
  };
};

export default function AdminProductsListPage() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse["data"] | null>(null);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "20", offset: "0" });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const payload = (await response.json()) as ProductsListResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar productos.");
      }
      setItems(payload.data.items);
      setSelectedIds((prev) => prev.filter((id) => payload.data.items.some((item) => item.id === id)));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar productos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCategories() {
    try {
      const response = await fetch("/api/admin/products/categories");
      const payload = (await response.json()) as CategoriesResponse | { error?: { message?: string } };
      if (response.ok && "data" in payload) {
        setCategories(payload.data.items);
      }
    } catch {
      setCategories([]);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          sku: sku || undefined,
          categoryId: categoryId ? Number(categoryId) : undefined,
        }),
      });
      const payload = (await response.json()) as CreateProductResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible crear el producto.");
      }
      setMessage(`Producto creado (#${payload.data.id}).`);
      setName("");
      setSku("");
      setCategoryId("");
      await loadProducts();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No fue posible crear el producto.");
    } finally {
      setCreating(false);
    }
  }

  async function runBulkAction(body: Record<string, unknown>) {
    setBulkLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as BulkResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible ejecutar la accion masiva.");
      }
      setMessage(`Actualizados ${payload.data.updatedCount} productos.`);
      await loadProducts();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "No fue posible ejecutar la accion masiva.");
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleImportProducts() {
    if (!importFile) return;
    setImporting(true);
    setError(null);
    setMessage(null);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append("file", importFile);
      const response = await fetch("/api/admin/import/products.csv", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as ImportResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible importar CSV.");
      }
      setImportResult(payload.data);
      setMessage(`Importado: ${payload.data.created} creados, ${payload.data.updated} actualizados.`);
      await loadProducts();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "No fue posible importar CSV.");
    } finally {
      setImporting(false);
    }
  }

  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const someSelected = selectedIds.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear producto</CardTitle>
          <CardDescription>Alta rápida para inventario básico.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={handleCreate}>
            <Input
              className="md:col-span-2"
              placeholder="Nombre"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Input placeholder="SKU (opcional)" value={sku} onChange={(event) => setSku(event.target.value)} />
            <Input
              type="number"
              min={1}
              placeholder="Category ID"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            />
            <div className="md:col-span-4">
              <Button disabled={creating} type="submit">
                {creating ? "Guardando..." : "Crear producto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle>Productos</CardTitle>
          <CardDescription>Tabla base para búsqueda y acceso rápido a variantes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void loadProducts();
            }}
          >
            <Input
              className="max-w-md"
              placeholder="Buscar por nombre, SKU o slug"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button type="submit">Buscar</Button>
            <Button asChild type="button" variant="outline">
              <a href="/api/admin/exports/products.csv">Export products</a>
            </Button>
            <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
              Import products
            </Button>
            <Button type="button" variant="outline" onClick={() => void fetch("/api/admin/products/generate-slugs", { method: "POST" }).then(() => loadProducts())}>
              Generar slugs
            </Button>
          </form>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedIds.length > 0 ? `${selectedIds.length} seleccionados` : "Selecciona productos para acciones masivas"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!someSelected || bulkLoading}
                  onClick={() =>
                    void runBulkAction({
                      action: "SET_ACTIVE",
                      productIds: selectedIds,
                      isActive: true,
                    })
                  }
                >
                  Activar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!someSelected || bulkLoading}
                  onClick={() =>
                    void runBulkAction({
                      action: "SET_ACTIVE",
                      productIds: selectedIds,
                      isActive: false,
                    })
                  }
                >
                  Desactivar
                </Button>
                <Select
                  className="min-w-44"
                  value={bulkCategoryId}
                  onChange={(event) => setBulkCategoryId(event.target.value)}
                  disabled={!someSelected || bulkLoading}
                >
                  <option value="">Asignar categoria...</option>
                  <option value="__NONE__">Quitar categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={String(category.id)}>
                      {category.name}
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  disabled={!someSelected || !bulkCategoryId || bulkLoading}
                  onClick={() =>
                    void runBulkAction({
                      action: "SET_CATEGORY",
                      productIds: selectedIds,
                      categoryId: bulkCategoryId === "__NONE__" ? null : Number(bulkCategoryId),
                    })
                  }
                >
                  Aplicar categoria
                </Button>
              </div>
            </div>
          </div>

          {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        aria-label="Seleccionar todos"
                        checked={allSelected}
                        onChange={(event) => {
                          if (event.target.checked) setSelectedIds(items.map((item) => item.id));
                          else setSelectedIds([]);
                        }}
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0">
                        <AdminTableSkeleton rows={5} columns={9} />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>
                        <AdminEmptyState
                          title="Sin productos"
                          description="No hay productos con el filtro actual."
                          actionLabel="Recargar"
                          onAction={() => void loadProducts()}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar producto ${item.id}`}
                            checked={selectedIds.includes(item.id)}
                            onChange={(event) => {
                              setSelectedIds((prev) =>
                                event.target.checked
                                  ? Array.from(new Set([...prev, item.id]))
                                  : prev.filter((id) => id !== item.id),
                              );
                            }}
                          />
                        </TableCell>
                        <TableCell>{item.id}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.sku ?? "—"}</TableCell>
                        <TableCell>{item.categoryName ?? (item.categoryId ? `#${item.categoryId}` : "—")}</TableCell>
                        <TableCell>{item.slug ?? <Badge variant="outline">sin slug</Badge>}</TableCell>
                        <TableCell>
                          <AdminStatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />
                        </TableCell>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {item.slug ? (
                              <Button asChild size="sm" variant="outline">
                                <Link href={`/products/${item.slug}`} target="_blank">
                                  Ver
                                </Link>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                Ver
                              </Button>
                            )}
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/variants?productId=${item.id}`}>Variantes</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/products/${item.id}`}>Editar</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/products/${item.id}/images`}>Imágenes</Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar productos CSV</DialogTitle>
            <DialogDescription>
              Headers requeridos: productId,sku,name,categoryId,isActive,slug
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
            <div className="flex gap-2">
              <Button disabled={!importFile || importing} onClick={() => void handleImportProducts()}>
                {importing ? "Importando..." : "Procesar CSV"}
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                Cerrar
              </Button>
            </div>

            {importResult ? (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm">
                  Creados: <b>{importResult.created}</b> · Actualizados: <b>{importResult.updated}</b> · Fallidos:{" "}
                  <b>{importResult.failed}</b>
                </p>
                {importResult.errors.length > 0 ? (
                  <div className="max-h-56 overflow-auto rounded-md border bg-muted/20 p-2 text-xs">
                    {importResult.errors.slice(0, 50).map((rowError, index) => (
                      <p key={`${rowError.row}-${index}`}>
                        Fila {rowError.row}: {rowError.message}
                      </p>
                    ))}
                    {importResult.errors.length > 50 ? (
                      <p className="mt-1 text-muted-foreground">
                        ... y {importResult.errors.length - 50} errores mas
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
