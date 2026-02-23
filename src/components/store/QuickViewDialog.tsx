"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AddToCartButton } from "@/components/store/AddToCartButton";
import { Price } from "@/components/store/Price";
import { VariantSelector } from "@/components/store/VariantSelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

type ProductDetailPayload = {
  data: {
    id: number;
    slug: string | null;
    sku: string | null;
    name: string;
    category: { id: number; name: string } | null;
    price: { amount: string; currency: string } | null;
    image: { url: string; alt: string | null } | null;
    images: Array<{ id: string; url: string; alt: string | null; sortOrder: number; isPrimary: boolean }>;
    variants: Array<{
      id: string;
      sku: string | null;
      name: string;
      price: { amount: string; currency: string } | null;
      availableToSell?: string;
      isInStock?: boolean;
    }>;
  };
};

type Props = {
  slug?: string | null;
  productName: string;
};

function QuickViewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-full" />
    </div>
  );
}

export function QuickViewDialog({ slug, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetailPayload["data"] | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/store/products/${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ProductDetailPayload | { error?: { message?: string } };
      if (!response.ok || !("data" in payload)) {
        throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar el producto.");
      }
      setProduct(payload.data);
      setSelectedVariantId(payload.data.variants[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el producto.");
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!open || product || loading || !slug) return;
    void load();
  }, [load, loading, open, product, slug]);

  const selectedVariant = useMemo(
    () => product?.variants.find((v) => v.id === selectedVariantId) ?? product?.variants[0] ?? null,
    [product?.variants, selectedVariantId],
  );

  const activePrice = selectedVariant?.price ?? product?.price ?? null;
  const hasVariants = (product?.variants.length ?? 0) > 0;
  const inStock = hasVariants ? (selectedVariant?.isInStock ?? false) : true;

  const disabledReason = hasVariants
    ? !selectedVariant
      ? "Selecciona una variante."
      : !selectedVariant.price
        ? "La variante no tiene precio."
        : !selectedVariant.isInStock
          ? "La variante no tiene stock."
          : null
    : !product?.price
      ? "El producto no tiene precio."
      : null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={!slug}
        aria-label={`Vista rapida de ${productName}`}
      >
        Vista rapida
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0">
          <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
            <div className="border-b border-border/60 md:border-b-0 md:border-r">
              {loading ? (
                <div className="p-5">
                  <QuickViewSkeleton />
                </div>
              ) : error ? (
                <div className="flex min-h-[26rem] flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button variant="outline" onClick={() => void load()}>
                    Reintentar
                  </Button>
                </div>
              ) : product ? (
                <div className="relative h-full min-h-[20rem] bg-muted/20">
                  {product.images[0]?.url || product.image?.url ? (
                    <Image
                      src={product.images[0]?.url ?? product.image!.url}
                      alt={product.images[0]?.alt ?? product.image?.alt ?? product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[20rem] items-center justify-center bg-gradient-to-br from-muted to-muted/30">
                      <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-xs font-semibold tracking-[0.2em]">
                        PG
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="p-5 sm:p-6">
              {loading ? (
                <QuickViewSkeleton />
              ) : error ? (
                <div className="space-y-3">
                  <DialogHeader>
                    <DialogTitle>Vista rapida</DialogTitle>
                    <DialogDescription>No se pudo cargar el producto.</DialogDescription>
                  </DialogHeader>
                  <Button variant="outline" onClick={() => void load()}>
                    Reintentar
                  </Button>
                </div>
              ) : product ? (
                <div className="space-y-4">
                  <DialogHeader>
                    <DialogTitle>{product.name}</DialogTitle>
                    <DialogDescription>{product.category?.name ?? "Sin categoria"}</DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-wrap gap-2">
                    {!activePrice ? <Badge variant="outline">Sin precio</Badge> : null}
                    {!inStock ? <Badge variant="secondary">Sin stock</Badge> : null}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Precio</p>
                    <Price
                      amount={activePrice?.amount}
                      currency={activePrice?.currency ?? "COP"}
                      className="mt-1 text-2xl font-semibold tracking-tight"
                    />
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

                  <AddToCartButton
                    productId={product.id}
                    variantId={selectedVariant?.id ?? null}
                    disabled={!!disabledReason}
                    disabledReason={disabledReason}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

