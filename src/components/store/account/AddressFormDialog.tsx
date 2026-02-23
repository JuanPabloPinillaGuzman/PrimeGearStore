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
      setError(e instanceof Error ? e.message : "Could not save address.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValue ? "Editar direccion" : "Nueva direccion"}</DialogTitle>
          <DialogDescription>Guarda direcciones para acelerar checkout.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as "SHIPPING" | "BILLING" }))}
            >
              <option value="SHIPPING">SHIPPING</option>
              <option value="BILLING">BILLING</option>
            </Select>
            <Input
              value={form.country}
              onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              placeholder="Pais"
            />
          </div>
          <Input
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            placeholder="Nombre completo"
            required
          />
          <Input
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="Telefono"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={form.department}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="Departamento"
              required
            />
            <Input
              value={form.city}
              onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Ciudad"
              required
            />
          </div>
          <Input
            value={form.addressLine1}
            onChange={(e) => setForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
            placeholder="Direccion principal"
            required
          />
          <Input
            value={form.addressLine2 ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, addressLine2: e.target.value }))}
            placeholder="Complemento (opcional)"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={form.postalCode ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
              placeholder="Codigo postal"
            />
            <label className="flex items-center gap-2 rounded-md border px-3 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
              />
              Predeterminada
            </label>
          </div>
          <Input
            value={form.notes ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Notas (opcional)"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
