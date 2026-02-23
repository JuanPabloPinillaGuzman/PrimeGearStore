"use client";

import { FormEvent, useState } from "react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

const LOW_STOCK_THRESHOLD = 5;

export default function AdminStockPage() {
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [items, setItems] = useState<StockResponse["data"]["items"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadStock(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "50", offset: "0" });
      if (search.trim()) params.set("search", search.trim());
      if (branchId.trim()) params.set("branchId", branchId.trim());

      const response = await fetch(`/api/admin/inventory/stock?${params.toString()}`);
      const payload = (await response.json()) as StockResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar stock.");
      }
      setItems(payload.data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar stock.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock de inventario</CardTitle>
        <CardDescription>Consulta rápida por producto y branch.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto]" onSubmit={loadStock}>
          <Input
            placeholder="Buscar por nombre o SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Input
            placeholder="Branch ID"
            type="number"
            min={1}
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
          />
          <Button type="submit">{loading ? "Consultando..." : "Consultar"}</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch("");
              setBranchId("");
              setItems([]);
            }}
          >
            Limpiar
          </Button>
        </form>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Alertas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <AdminTableSkeleton rows={6} columns={5} />
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <AdminEmptyState
                        title="Sin resultados"
                        description="Usa filtros y presiona Consultar para cargar stock."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const stock = Number(item.stockOnHand);
                    const lowStock = !Number.isNaN(stock) && stock < LOW_STOCK_THRESHOLD;

                    return (
                      <TableRow key={`${item.productId}-${item.branchId ?? "global"}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.sku ?? "—"}</TableCell>
                        <TableCell>{item.branchId ?? "GLOBAL"}</TableCell>
                        <TableCell>{item.stockOnHand}</TableCell>
                        <TableCell>
                          {lowStock ? <Badge variant="destructive">Low stock</Badge> : <Badge variant="outline">OK</Badge>}
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
  );
}
