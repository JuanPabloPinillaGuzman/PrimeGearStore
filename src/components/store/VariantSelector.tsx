"use client";

import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  sku: string | null;
  name: string;
  price: { amount: string; currency: string } | null;
  stockOnHand?: string;
  availableToSell?: string;
  isInStock?: boolean;
};

type Props = {
  variants: Variant[];
  selectedId: string | null;
  onChange: (variantId: string) => void;
};

export function VariantSelector({ variants, selectedId, onChange }: Props) {
  if (variants.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Selecciona variante</p>
        <p className="text-xs text-muted-foreground">Talla / color / presentación</p>
      </div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Variantes del producto">
        {variants.map((variant) => {
          const active = selectedId === variant.id;
          const disabled = variant.isInStock === false || !variant.price;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={disabled}
              onClick={() => !disabled && onChange(variant.id)}
              className={cn(
                "min-w-[9rem] rounded-xl border px-3 py-2 text-left transition",
                active
                  ? "border-foreground/30 bg-foreground/[0.03] shadow-sm"
                  : "border-border/70 bg-background hover:border-border",
                disabled && "cursor-not-allowed opacity-55",
              )}
            >
              <p className="text-sm font-medium leading-tight">{variant.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {variant.isInStock === false ? "Sin stock" : variant.availableToSell ? `${variant.availableToSell} disp.` : "Disponible"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
