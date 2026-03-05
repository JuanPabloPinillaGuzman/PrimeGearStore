"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ProductItem = {
  id: number;
  name: string;
  sku: string | null;
  isFeatured: boolean;
  categoryName: string | null;
};

export default function AdminFeaturedPage() {
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products?limit=200", { cache: "no-store" });
      const payload = (await res.json()) as
        | { data: { items: ProductItem[] } }
        | { error?: { message?: string } };
      if (!res.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar productos.");
      }
      setItems(payload.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar productos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function toggleFeatured(item: ProductItem) {
    setToggling(item.id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${item.id}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !item.isFeatured }),
      });
      const payload = (await res.json()) as
        | { data: { isFeatured: boolean } }
        | { error?: { message?: string } };
      if (!res.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible actualizar.");
      }
      setMessage(`"${item.name}" ${!item.isFeatured ? "agregado a" : "removido de"} destacados.`);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar.");
    } finally {
      setToggling(null);
    }
  }

  const featuredCount = items.filter((i) => i.isFeatured).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Productos recomendados</CardTitle>
          <CardDescription>
            Marca hasta 8 productos para mostrarlos en la sección &quot;Selección recomendada&quot; de la tienda.
            Actualmente: <strong>{featuredCount}</strong> / 8 destacados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <AdminTableSkeleton rows={8} columns={5} />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <AdminEmptyState title="Sin productos" description="No hay productos activos." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.sku ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{item.categoryName ?? "—"}</TableCell>
                        <TableCell>
                          {item.isFeatured ? (
                            <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
                              <Star className="size-3 fill-amber-500 text-amber-500" />
                              Destacado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Normal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={item.isFeatured ? "outline" : "default"}
                            disabled={toggling === item.id || (!item.isFeatured && featuredCount >= 8)}
                            onClick={() => void toggleFeatured(item)}
                            type="button"
                          >
                            {toggling === item.id
                              ? "..."
                              : item.isFeatured
                                ? "Quitar"
                                : "Destacar"}
                          </Button>
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
    </div>
  );
}
