"use client";

import { FormEvent, useEffect, useState } from "react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTableSkeleton } from "@/components/admin/AdminTableSkeleton";
import { formatCop, formatDateTime } from "@/components/admin/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type CouponItem = {
  id: string;
  code: string;
  type: string;
  value: string;
  currency: string;
  minSubtotal: string;
  startsAt: string | null;
  endsAt: string | null;
  redeemedCount: number;
  maxRedemptions: number | null;
  isActive: boolean;
};

type CouponRedemption = { id: string; orderNumber: string; redeemedAt: string };

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

export default function AdminCouponsPage() {
  const [items, setItems] = useState<CouponItem[]>([]);
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lookupCode, setLookupCode] = useState("");

  // Create form
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editingCoupon, setEditingCoupon] = useState<CouponItem | null>(null);
  const [editType, setEditType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [editValue, setEditValue] = useState("");
  const [editMinSubtotal, setEditMinSubtotal] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editMaxRedemptions, setEditMaxRedemptions] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deletingCoupon, setDeletingCoupon] = useState<CouponItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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
          startsAt: startsAt || null,
          endsAt: endsAt || null,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
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
      setStartsAt("");
      setEndsAt("");
      setMaxRedemptions("");
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

  function openEditDialog(item: CouponItem) {
    setEditingCoupon(item);
    setEditType(item.type as "PERCENT" | "FIXED");
    setEditValue(item.value);
    setEditMinSubtotal(item.minSubtotal);
    setEditStartsAt(toLocalDatetimeValue(item.startsAt));
    setEditEndsAt(toLocalDatetimeValue(item.endsAt));
    setEditMaxRedemptions(item.maxRedemptions != null ? String(item.maxRedemptions) : "");
    setEditIsActive(item.isActive);
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingCoupon) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/coupons/${encodeURIComponent(editingCoupon.code)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editType,
          value: Number(editValue),
          minSubtotal: editMinSubtotal ? Number(editMinSubtotal) : 0,
          startsAt: editStartsAt || null,
          endsAt: editEndsAt || null,
          maxRedemptions: editMaxRedemptions ? Number(editMaxRedemptions) : null,
          isActive: editIsActive,
        }),
      });
      const payload = (await response.json()) as
        | { data: { code: string } }
        | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible guardar.");
      }
      setMessage(`Cupón ${payload.data.code} actualizado.`);
      setEditingCoupon(null);
      await loadCoupons();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deletingCoupon) return;
    setDeleting(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/coupons/${encodeURIComponent(deletingCoupon.code)}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as
        | { data: { code: string } }
        | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible eliminar.");
      }
      setMessage(`Cupón ${payload.data.code} eliminado.`);
      setDeletingCoupon(null);
      await loadCoupons();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar.");
    } finally {
      setDeleting(false);
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
      {/* Edit dialog */}
      <Dialog open={!!editingCoupon} onOpenChange={(open) => { if (!open) setEditingCoupon(null); }}>
        <DialogContent>
          <form onSubmit={(e) => void saveEdit(e)}>
            <DialogHeader>
              <DialogTitle>Editar cupón {editingCoupon?.code}</DialogTitle>
              <DialogDescription>Modifica los campos y guarda los cambios.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                  <Select value={editType} onChange={(e) => setEditType(e.target.value as "PERCENT" | "FIXED")}>
                    <option value="PERCENT">Porcentaje (%)</option>
                    <option value="FIXED">Monto fijo ($)</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Valor</label>
                  <Input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Subtotal mínimo</label>
                <Input type="number" step="0.01" value={editMinSubtotal} onChange={(e) => setEditMinSubtotal(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Inicio</label>
                  <Input type="datetime-local" value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Vencimiento</label>
                  <Input type="datetime-local" value={editEndsAt} onChange={(e) => setEditEndsAt(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Máx. redenciones</label>
                <Input type="number" step="1" placeholder="Sin límite" value={editMaxRedemptions} onChange={(e) => setEditMaxRedemptions(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-active"
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="size-4"
                />
                <label htmlFor="edit-active" className="text-sm">Activo</label>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditingCoupon(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deletingCoupon} onOpenChange={(open) => { if (!open) setDeletingCoupon(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cupón?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El cupón <strong>{deletingCoupon?.code}</strong> será eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setDeletingCoupon(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Crear cupón</CardTitle>
          <CardDescription>Promociones manuales por porcentaje o monto fijo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={(e) => void createCoupon(e)}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Input placeholder="WELCOME10" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
              <Select value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}>
                <option value="PERCENT">Porcentaje (%)</option>
                <option value="FIXED">Monto fijo ($)</option>
              </Select>
              <Input type="number" step="0.01" placeholder="Valor" value={value} onChange={(e) => setValue(e.target.value)} required />
              <Input type="number" step="0.01" placeholder="Min subtotal" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Inicio (opcional)</label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vencimiento (opcional)</label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Máx. redenciones (opcional)</label>
                <Input type="number" step="1" placeholder="Sin límite" value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
              </div>
            </div>
            <div>
              <Button disabled={creating} type="submit">
                {creating ? "Creando..." : "Crear cupón"}
              </Button>
            </div>
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
          <CardDescription>Activar/desactivar, editar y eliminar cupones.</CardDescription>
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
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Redenciones</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <AdminTableSkeleton rows={5} columns={8} />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <AdminEmptyState title="Sin cupones" description="Crea el primer cupón para empezar." />
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-medium">{item.code}</TableCell>
                        <TableCell>{item.type === "PERCENT" ? "Porcentaje" : "Monto fijo"}</TableCell>
                        <TableCell>
                          {item.type === "FIXED" ? formatCop(item.value) : `${item.value}%`}
                        </TableCell>
                        <TableCell>{Number(item.minSubtotal) > 0 ? formatCop(item.minSubtotal) : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.endsAt ? formatDateTime(item.endsAt) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.redeemedCount}/{item.maxRedemptions ?? "∞"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AdminStatusBadge status={item.isActive ? "ACTIVE" : "INACTIVE"} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => void toggleCoupon(item)} type="button">
                              {item.isActive ? "Desactivar" : "Activar"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(item)} type="button">
                              Editar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setDeletingCoupon(item)} type="button">
                              Eliminar
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
    </div>
  );
}
