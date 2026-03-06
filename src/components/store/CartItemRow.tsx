"use client";

import { Minus, Package, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";

import { Price } from "@/components/store/Price";
import { Button } from "@/components/ui/button";

type Props = {
  item: {
    id: string;
    productName: string;
    variantName: string | null;
    quantity: string;
    lineTotal: string;
    unitPriceSnapshot: string;
    currency: string;
  };
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  loading?: boolean;
};

export function CartItemRow({ item, onIncrement, onDecrement, onRemove, loading }: Props) {
  const qty = Number(item.quantity);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-3"
    >
      {/* Thumbnail placeholder */}
      <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted/60">
        <Package className="size-5 text-muted-foreground/50" />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.productName}</p>
        {item.variantName && (
          <p className="mt-0.5 text-xs text-muted-foreground">{item.variantName}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          <Price amount={item.unitPriceSnapshot} currency={item.currency} /> c/u
        </p>
      </div>

      {/* Controls + total */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Price
          amount={item.lineTotal}
          currency={item.currency}
          className="text-sm font-bold"
        />

        {/* Stepper rounded-full */}
        <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background px-1 py-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="size-6 rounded-full"
            onClick={onDecrement}
            disabled={loading || qty <= 1}
            aria-label="Reducir cantidad"
          >
            <Minus className="size-3" />
          </Button>
          <span className="min-w-5 text-center text-xs font-semibold">{qty}</span>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 rounded-full"
            onClick={onIncrement}
            disabled={loading}
            aria-label="Aumentar cantidad"
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </div>

      {/* Remove */}
      <Button
        size="icon"
        variant="ghost"
        className="size-7 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
        onClick={onRemove}
        disabled={loading}
        aria-label="Eliminar item"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </motion.div>
  );
}
