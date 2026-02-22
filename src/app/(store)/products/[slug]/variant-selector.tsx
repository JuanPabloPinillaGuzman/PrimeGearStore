"use client";

import { useMemo, useState } from "react";

type Variant = {
  id: string;
  sku: string | null;
  name: string;
  price: { amount: string; currency: string } | null;
  stockOnHand?: string;
  availableToSell?: string;
  isInStock?: boolean;
};

export function VariantSelector({ variants }: { variants: Variant[] }) {
  const [selectedId, setSelectedId] = useState<string>(variants[0]?.id ?? "");

  const selected = useMemo(
    () => variants.find((variant) => variant.id === selectedId) ?? variants[0] ?? null,
    [selectedId, variants],
  );

  if (variants.length === 0) return null;

  return (
    <div className="mt-6 rounded-md border p-3">
      <h2 className="mb-2 text-sm font-medium">Selecciona variante</h2>
      <select
        className="w-full rounded-md border px-3 py-2 text-sm"
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
      >
        {variants.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.name}
          </option>
        ))}
      </select>

      {selected && (
        <div className="mt-3 space-y-1 text-sm">
          <p>
            SKU: <strong>{selected.sku ?? "N/A"}</strong>
          </p>
          <p>
            Precio:{" "}
            <strong>
              {selected.price ? `${selected.price.currency} ${selected.price.amount}` : "Sin precio vigente"}
            </strong>
          </p>
          <p>
            Stock disponible: <strong>{selected.availableToSell ?? "0"}</strong>
          </p>
          <p className={selected.isInStock ? "" : "text-red-600"}>
            {selected.isInStock ? "Disponible" : "Sin stock"}
          </p>
          <p className="text-xs text-muted-foreground">Variant ID: {selected.id}</p>
        </div>
      )}
    </div>
  );
}

