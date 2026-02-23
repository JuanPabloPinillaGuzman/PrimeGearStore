"use client";

import { FormEvent, useEffect, useState } from "react";

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

type CouponItem = {
  id: string;
  code: string;
  type: string;
  value: string;
  currency: string;
  minSubtotal: string;
  redeemedCount: number;
  maxRedemptions: number | null;
  isActive: boolean;
};

type CouponRedemption = { id: string; orderNumber: string; redeemedAt: string };

export default function AdminCouponsPage() {
  const [items, setItems] = useState<CouponItem[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookupCode, setLookupCode] = useState("");

  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadCoupons() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/coupons");
      const payload = (await response.json()) as
        | { data: { items: CouponItem[] } }
        | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar cupones.");
      }
      setItems(payload.data.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar cupones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  async function createCoupon(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          type,
          value: Number(value),
          minSubtotal: minSubtotal ? Number(minSubtotal) : 0,
          currency: "COP",
        }),
      });
      const payload = (await response.json()) as
        | { data: { code: string } }
        | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible crear el cupón.");
      }
      setMessage(`Cupón ${payload.data.code} creado.`);
      setCode("");
      setValue("");
      setMinSubtotal("");
      await loadCoupons();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No fue posible crear el cupón.");
    } finally {
      setCreating(false);
    }
  }

  async function toggleCoupon(item: CouponItem) {
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/coupons/${encodeURIComponent(item.code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const payload = (await response.json()) as
        | { data: { code: string } }
        | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible actualizar.");
      }
      setMessage(`Cupón ${payload.data.code} actualizado.`);
      await loadCoupons();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "No fue posible actualizar.");
    }
  }

  async function lookupCouponRedemptions() {
    setMessage(null);
    setError(null);
    try {
      if (!lookupCode.trim()) {
        setRedemptions([]);
        return;
      }
      const response = await fetch(`/api/admin/coupons/${encodeURIComponent(lookupCode)}/redemptions`);
      const payload = (await response.json()) as
        | { data: { items: CouponRedemption[] } }
        | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible consultar redenciones.");
      }
      setRedemptions(payload.data.items);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "No fue posible consultar redenciones.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear cupón</CardTitle>
          <CardDescription>Promociones manuales por porcentaje o monto fijo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5" onSubmit={createCoupon}>
            <Input placeholder="WELCOME10" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
            <Select value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}>
              <option value="PERCENT">PERCENT</option>
              <option value="FIXED">FIXED</option>
            </Select>
            <Input type="number" step="0.01" placeholder="Valor" value={value} onChange={(e) => setValue(e.target.value)} required />
            <Input
              type="number"
              step="0.01"
              placeholder="Min subtotal"
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value)}
            />
            <Button disabled={creating} type="submit">
              {creating ? "Creando..." : "Crear"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redenciones</CardTitle>
          <CardDescription>Consulta rápida por código de cupón.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-xs"
              placeholder="Código"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
            />
            <Button type="button" variant="outline" onClick={() => void lookupCouponRedemptions()}>
              Ver redenciones
            </Button>
          </div>
          <div className="rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        {lookupCode ? "Sin redenciones." : "Ingresa un código para consultar."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    redemptions.map((redemption) => (
                      <TableRow key={redemption.id}>
                        <TableCell>{redemption.orderNumber}</TableCell>
                        <TableCell>{formatDateTime(redemption.redeemedAt)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado de cupones</CardTitle>
          <CardDescription>Activar/desactivar y revisar rendimiento rápido.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <div className="overflow-hidden rounded-xl border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Mínimo</TableHead>
                    <TableHead>Redenciones</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
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
                      <TableCell colSpan={7}>
                        <AdminEmptyState title="Sin cupones" description="Crea el primer cupón para empezar." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.code}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell>
                          {item.type === "FIXED" ? formatCop(item.value) : `${item.value}%`}
                        </TableCell>
                        <TableCell>{formatCop(item.minSubtotal)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.redeemedCount}/{item.maxRedemptions ?? "∞"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => void toggleCoupon(item)} type="button">
                            {item.isActive ? "Desactivar" : "Activar"}
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
