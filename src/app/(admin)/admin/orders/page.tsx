"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { formatCop, formatDateTime } from "@/components/admin/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type OrderRow = {
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  paymentStatus: string | null;
  saleId: string | null;
  converted: boolean;
};

type OrdersListResponse = {
  data: {
    items: OrderRow[];
    pagination: { limit: number; offset: number; count: number };
  };
};

type OrdersStatusFilter =
  | ""
  | "PENDING_PAYMENT"
  | "PAID"
  | "PACKING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrdersStatusFilter>("");
  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "20", offset: "0" });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      const payload = (await response.json()) as OrdersListResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar pedidos.");
      }
      setItems(payload.data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runOrderAction(
    orderNumber: string,
    action:
      | { type: "reconcile" }
      | { type: "cancel" }
      | { type: "status"; status: "PACKING" | "SHIPPED" | "DELIVERED" },
  ) {
    setBusyOrder(orderNumber);
    setMessage(null);
    setError(null);
    try {
      let url = "";
      let method: "POST" | "PATCH" = "POST";
      let body: unknown = {};

      if (action.type === "reconcile") {
        url = `/api/admin/orders/${encodeURIComponent(orderNumber)}/reconcile-payment`;
      } else if (action.type === "cancel") {
        url = `/api/admin/orders/${encodeURIComponent(orderNumber)}/cancel`;
      } else {
        url = `/api/admin/orders/${encodeURIComponent(orderNumber)}/status`;
        method = "PATCH";
        body = { status: action.status };
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as
        | { data?: { message?: string } }
        | { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(("error" in payload && payload.error?.message) || "Acción no completada.");
      }

      setMessage(("data" in payload && payload.data?.message) || `Acción aplicada a ${orderNumber}.`);
      await loadOrders();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Acción no completada.");
    } finally {
      setBusyOrder(null);
    }
  }

  function submitFilters(event: FormEvent) {
    event.preventDefault();
    void loadOrders();
  }

  const activeFiltersCount = useMemo(() => Number(Boolean(search.trim())) + Number(Boolean(status)), [search, status]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle>Pedidos</CardTitle>
          <CardDescription>Filtra, reconcilia pagos y ejecuta transiciones de fulfillment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto]" onSubmit={submitFilters}>
            <Input
              aria-label="Buscar pedido"
              placeholder="Buscar por order number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => setStatus(event.target.value as OrdersStatusFilter)}
            >
              <option value="">Todos los estados</option>
              <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
              <option value="PAID">PAID</option>
              <option value="PACKING">PACKING</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
            </Select>
            <Button type="submit">Aplicar</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatus("");
                setTimeout(() => void loadOrders(), 0);
              }}
            >
              Limpiar
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{items.length} resultados</Badge>
            {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount} filtros activos</Badge>}
          </div>

          {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Pago</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Venta</TableHead>
                    <TableHead className="min-w-[360px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <AdminTableSkeleton rows={5} columns={7} />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-4">
                        <AdminEmptyState
                          title="Sin pedidos"
                          description="No hay pedidos con los filtros actuales."
                          actionLabel="Recargar"
                          onAction={() => void loadOrders()}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.orderNumber}>
                        <TableCell className="font-medium">{item.orderNumber}</TableCell>
                        <TableCell>
                          <AdminStatusBadge status={item.status} />
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge status={item.paymentStatus} />
                        </TableCell>
                        <TableCell>{formatCop(item.total)}</TableCell>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>
                          {item.saleId ? <Badge>#{item.saleId}</Badge> : <Badge variant="outline">{item.converted ? "Sí" : "No"}</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/admin/orders/${item.orderNumber}`}>Ver detalle</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyOrder === item.orderNumber}
                              onClick={() => void runOrderAction(item.orderNumber, { type: "reconcile" })}
                              type="button"
                            >
                              Reconciliar
                            </Button>
                            {(item.status === "PENDING_PAYMENT" || item.status === "PAID") && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyOrder === item.orderNumber}
                                onClick={() => void runOrderAction(item.orderNumber, { type: "cancel" })}
                                type="button"
                              >
                                Cancelar
                              </Button>
                            )}
                            {item.status === "PAID" && (
                              <Button
                                size="sm"
                                disabled={busyOrder === item.orderNumber}
                                onClick={() =>
                                  void runOrderAction(item.orderNumber, { type: "status", status: "PACKING" })
                                }
                                type="button"
                              >
                                Marcar PACKING
                              </Button>
                            )}
                            {item.status === "PACKING" && (
                              <Button
                                size="sm"
                                disabled={busyOrder === item.orderNumber}
                                onClick={() =>
                                  void runOrderAction(item.orderNumber, { type: "status", status: "SHIPPED" })
                                }
                                type="button"
                              >
                                Marcar SHIPPED
                              </Button>
                            )}
                            {item.status === "SHIPPED" && (
                              <Button
                                size="sm"
                                disabled={busyOrder === item.orderNumber}
                                onClick={() =>
                                  void runOrderAction(item.orderNumber, { type: "status", status: "DELIVERED" })
                                }
                                type="button"
                              >
                                Marcar DELIVERED
                              </Button>
                            )}
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
    </div>
  );
}
