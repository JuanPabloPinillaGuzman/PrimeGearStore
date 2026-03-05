"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
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

export type AddressFormValue = {
  id?: string;
  type: "SHIPPING" | "BILLING";
  fullName: string;
  phone: string;
  country: string;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  isDefault: boolean;
};

function buildInitialForm(initialValue?: AddressFormValue | null): AddressFormValue {
  return (
    initialValue ?? {
      type: "SHIPPING",
      fullName: "",
      phone: "",
      country: "CO",
      department: "",
      city: "",
      addressLine1: "",
      addressLine2: "",
      postalCode: "",
      notes: "",
      isDefault: false,
    }
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
      {children}
    </label>
  );
}

export function AddressFormDialog({
  open,
  onOpenChange,
  initialValue,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValue?: AddressFormValue | null;
  onSubmit: (value: AddressFormValue) => Promise<void>;
  submitting?: boolean;
}) {
  const [form, setForm] = useState<AddressFormValue>(() => buildInitialForm(initialValue));
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible guardar la dirección.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue ? "Editar dirección" : "Nueva dirección"}</DialogTitle>
          <DialogDescription>Guarda direcciones para acelerar el checkout.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel htmlFor="addr-type">Tipo</FieldLabel>
              <Select
                id="addr-type"
                value={form.type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, type: e.target.value as "SHIPPING" | "BILLING" }))
                }
              >
                <option value="SHIPPING">Envío</option>
                <option value="BILLING">Facturación</option>
              </Select>
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="addr-country">País</FieldLabel>
              <Input
                id="addr-country"
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="CO"
              />
            </div>
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="addr-fullname">Nombre completo</FieldLabel>
            <Input
              id="addr-fullname"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="addr-phone">Teléfono</FieldLabel>
            <Input
              id="addr-phone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+57 300 000 0000"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel htmlFor="addr-dept">Departamento</FieldLabel>
              <Input
                id="addr-dept"
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                placeholder="Antioquia"
                required
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="addr-city">Ciudad</FieldLabel>
              <Input
                id="addr-city"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Medellín"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="addr-line1">Dirección</FieldLabel>
            <Input
              id="addr-line1"
              value={form.addressLine1}
              onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
              placeholder="Calle 10 # 40-20"
              required
            />
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="addr-line2">Complemento</FieldLabel>
            <Input
              id="addr-line2"
              value={form.addressLine2 ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, addressLine2: e.target.value }))}
              placeholder="Apto 301 (opcional)"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <FieldLabel htmlFor="addr-postal">Código postal</FieldLabel>
              <Input
                id="addr-postal"
                value={form.postalCode ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                placeholder="050001"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 self-end rounded-md border px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                aria-label="Marcar como dirección predeterminada"
              />
              Predeterminada
            </label>
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="addr-notes">Notas</FieldLabel>
            <Input
              id="addr-notes"
              value={form.notes ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Instrucciones de entrega (opcional)"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
