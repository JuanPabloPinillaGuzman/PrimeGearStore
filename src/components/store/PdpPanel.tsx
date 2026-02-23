"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AddToCartButton } from "@/components/store/AddToCartButton";
import { Price } from "@/components/store/Price";
import { VariantSelector } from "@/components/store/VariantSelector";
import { WishlistButton } from "@/components/store/WishlistButton";
import { Badge } from "@/components/ui/badge";

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
  product: {
    id: number;
    sku: string | null;
    slug: string | null;
    name: string;
    category: { id: number; name: string } | null;
    price: { amount: string; currency: string } | null;
    variants: Variant[];
  };
};

export function PdpPanel({ product }: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants[0]?.id ?? null,
  );

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0] ?? null,
    [product.variants, selectedVariantId],
  );

  const activePrice = selectedVariant?.price ?? product.price ?? null;
  const hasVariants = product.variants.length > 0;
  const inStock = hasVariants ? (selectedVariant?.isInStock ?? false) : true;

  const disabledReason = hasVariants
    ? !selectedVariant
      ? "Selecciona una variante para continuar."
      : !selectedVariant.price
        ? "La variante seleccionada no tiene precio vigente."
        : !selectedVariant.isInStock
          ? "La variante seleccionada no tiene stock."
          : null
    : !product.price
      ? "El producto no tiene precio vigente."
      : null;

  return (
    <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-background/80">
            {product.category?.name ?? "Sin categoria"}
          </Badge>
          {!activePrice ? (
            <Badge variant="outline" className="bg-background/80">
              Sin precio
            </Badge>
          ) : null}
          {!inStock ? (
            <Badge variant="secondary" className="bg-background/80 text-foreground">
              Sin stock
            </Badge>
          ) : null}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              SKU: {selectedVariant?.sku ?? product.sku ?? "N/A"}
            </p>
          </div>
          <WishlistButton productId={product.id} slug={product.slug} productName={product.name} size="icon" />
        </div>

        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">Precio</p>
          <div className="mt-1">
            <Price
              amount={activePrice?.amount}
              currency={activePrice?.currency ?? "COP"}
              className="text-2xl font-semibold tracking-tight"
            />
          </div>
          {hasVariants ? (
            <p className={`mt-2 text-sm ${inStock ? "text-muted-foreground" : "text-red-600"}`}>
              {inStock
                ? `Disponible${selectedVariant?.availableToSell ? ` (${selectedVariant.availableToSell} unidades)` : ""}`
                : "Sin stock en esta variante"}
            </p>
          ) : null}
        </div>

        {hasVariants ? (
          <VariantSelector
            variants={product.variants}
            selectedId={selectedVariant?.id ?? null}
            onChange={setSelectedVariantId}
          />
        ) : null}

        <div className="space-y-3 pt-2">
          <AddToCartButton
            productId={product.id}
            variantId={selectedVariant?.id ?? null}
            disabled={!!disabledReason}
            disabledReason={disabledReason}
          />
          <Link href="/checkout" className="inline-flex text-sm text-muted-foreground hover:text-foreground">
            Ir directo a checkout
          </Link>
        </div>
      </div>
    </section>
  );
}
