"use client";

import { useEffect, useMemo, useState } from "react";

import { AddressFormDialog, type AddressFormValue } from "@/components/store/account/AddressFormDialog";
import { EmptyState } from "@/components/store/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AddressItem = {
  id: string;
  type: string;
  fullName: string;
  phone: string;
  country: string;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
};

type AddressesResponse = { data: { items: AddressItem[] } };

function toFormValue(item: AddressItem): AddressFormValue {
  return {
    id: item.id,
    type: item.type as "SHIPPING" | "BILLING",
    fullName: item.fullName,
    phone: item.phone,
    country: item.country,
    department: item.department,
    city: item.city,
    addressLine1: item.addressLine1,
    addressLine2: item.addressLine2,
    postalCode: item.postalCode,
    notes: item.notes,
    isDefault: item.isDefault,
  };
}

export function AddressesList({
  onAddressesChange,
}: {
  onAddressesChange?: (items: AddressItem[]) => void;
}) {
  const [items, setItems] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AddressItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadAddresses() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/store/me/addresses", { cache: "no-store" });
      const payload = (await response.json()) as AddressesResponse | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar direcciones.");
      }
      setItems(payload.data.items);
      onAddressesChange?.(payload.data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible cargar direcciones.");
      setItems([]);
      onAddressesChange?.([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAddress(value: AddressFormValue) {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const isEdit = !!value.id;
      const url = isEdit ? `/api/store/me/addresses/${value.id}` : "/api/store/me/addresses";
      const method = isEdit ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: value.type,
          fullName: value.fullName,
          phone: value.phone,
          country: value.country,
          department: value.department,
          city: value.city,
          addressLine1: value.addressLine1,
          addressLine2: value.addressLine2 || undefined,
          postalCode: value.postalCode || undefined,
          notes: value.notes || undefined,
          isDefault: value.isDefault,
        }),
      });
      const payload = (await response.json()) as { data?: AddressItem; error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible guardar.");
      }
      setMessage(isEdit ? "Direccion actualizada." : "Direccion creada.");
      await loadAddresses();
    } finally {
      setSubmitting(false);
    }
  }

  async function removeAddress(id: string) {
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/store/me/addresses/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { data?: { deleted: boolean }; error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible eliminar.");
      }
      setMessage("Direccion eliminada.");
      await loadAddresses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No fue posible eliminar.");
    }
  }

  const grouped = useMemo(
    () => ({
      shipping: items.filter((i) => i.type === "SHIPPING"),
      billing: items.filter((i) => i.type === "BILLING"),
    }),
    [items],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Administra direcciones guardadas para checkout.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Nueva direccion
        </Button>
      </div>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="Sin direcciones" description="Guarda una direccion para acelerar futuras compras." />
      ) : (
        <div className="space-y-5">
          {([["SHIPPING", grouped.shipping], ["BILLING", grouped.billing]] as const).map(([label, list]) => (
            <section key={label} className="space-y-2">
              <h3 className="text-sm font-semibold tracking-tight">{label === "SHIPPING" ? "Envio" : "Facturacion"}</h3>
              {list.length === 0 ? (
                <Card className="py-0">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    Sin direcciones de este tipo.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {list.map((item) => (
                    <Card key={item.id} className="py-0">
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.fullName}</p>
                            {item.isDefault ? <Badge>Predeterminada</Badge> : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {item.addressLine1}
                            {item.addressLine2 ? `, ${item.addressLine2}` : ""} - {item.city}, {item.department}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.country} · {item.phone}
                            {item.postalCode ? ` · ${item.postalCode}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditing(item);
                              setDialogOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          {!item.isDefault ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void saveAddress({ ...toFormValue(item), isDefault: true })}
                              disabled={submitting}
                            >
                              Predeterminada
                            </Button>
                          ) : null}
                          <Button variant="destructive" size="sm" onClick={() => void removeAddress(item.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {dialogOpen ? (
        <AddressFormDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialValue={editing ? toFormValue(editing) : null}
          onSubmit={saveAddress}
          submitting={submitting}
        />
      ) : null}
    </div>
  );
}
