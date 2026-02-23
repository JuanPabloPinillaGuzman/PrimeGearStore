"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

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
    <div className="rounded-xl border border-border/70 bg-card/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{item.productName}</p>
          {item.variantName ? <p className="mt-0.5 text-xs text-muted-foreground">{item.variantName}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">
            Unitario: <Price amount={item.unitPriceSnapshot} currency={item.currency} />
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            <Price amount={item.lineTotal} currency={item.currency} />
          </p>
          <div className="mt-2 flex items-center gap-1">
            <Button size="icon-sm" variant="outline" onClick={onDecrement} disabled={loading || qty <= 1}>
              <Minus className="size-3.5" />
            </Button>
            <span className="min-w-8 text-center text-sm">{qty}</span>
            <Button size="icon-sm" variant="outline" onClick={onIncrement} disabled={loading}>
              <Plus className="size-3.5" />
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={onRemove} disabled={loading} aria-label="Eliminar item">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
