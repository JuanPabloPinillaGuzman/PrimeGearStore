"use client";

import { motion } from "motion/react";

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
      <p className="text-sm font-semibold">Variante</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Variantes del producto">
        {variants.map((variant) => {
          const active = selectedId === variant.id;
          const disabled = variant.isInStock === false || !variant.price;

          return (
            <motion.button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={disabled}
              onClick={() => !disabled && onChange(variant.id)}
              whileTap={!disabled ? { scale: 0.94 } : undefined}
              className={cn(
                "relative rounded-xl border px-3.5 py-2 text-left text-sm transition-all duration-150",
                active
                  ? "border-primary bg-primary/8 font-semibold shadow-sm"
                  : "border-border/70 bg-background hover:border-primary/40",
                disabled && "cursor-not-allowed opacity-40",
              )}
            >
              {/* Active indicator ring */}
              {active && (
                <motion.span
                  layoutId="variant-active-ring"
                  className="absolute inset-0 rounded-xl border-2 border-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative block leading-tight">{variant.name}</span>
              <span className="relative mt-0.5 block text-[11px] text-muted-foreground">
                {variant.isInStock === false
                  ? "Sin stock"
                  : variant.availableToSell
                    ? `${variant.availableToSell} disp.`
                    : "Disponible"}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
