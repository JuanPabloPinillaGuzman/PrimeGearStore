"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { AddToCartButton } from "@/components/store/AddToCartButton";
import { Price } from "@/components/store/Price";

type ProductCardProps = {
  product: {
    id: number;
    sku: string | null;
    slug: string | null;
    name: string;
    category: { id: number; name: string } | null;
    price: { amount: string; currency: string } | null;
    image: { url: string; alt: string | null } | null;
    variants?: Array<{ id: string; isInStock?: boolean }>;
  };
  index?: number;
  variant?: "catalog" | "featured";
};

function resolveProductHref(product: ProductCardProps["product"]) {
  return product.slug ? `/products/${product.slug}` : `/store/products/${product.id}`;
}

function resolveStock(product: ProductCardProps["product"]) {
  if (!product.variants || product.variants.length === 0) return undefined;
  return product.variants.some((v) => v.isInStock !== false);
}

function ImageFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-50 dark:bg-neutral-900">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-zinc-300 dark:text-neutral-600"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    </div>
  );
}

export function ProductCard({ product, variant = "catalog" }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const href = resolveProductHref(product);
  const hasPrice = !!product.price;
  const inStock = resolveStock(product);
  const showNoStock = inStock === false;
  const canAddToCart = hasPrice && !showNoStock;
  const isFeatured = variant === "featured";

  const singleVariantId =
    product.variants && product.variants.length === 1
      ? (product.variants[0]?.id ?? null)
      : null;

  const imageHeight = isFeatured ? "h-52" : "h-48";
  const hasImage = !!product.image?.url && !imgError;

  return (
    <div className={`group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md hover:shadow-black/5${isFeatured ? " h-full" : ""}`}>
      {/* Image */}
      <Link
        href={href}
        className={`relative block overflow-hidden ${imageHeight} shrink-0 bg-white dark:bg-neutral-950`}
      >
        {hasImage ? (
          <Image
            src={product.image!.url}
            alt={product.image!.alt ?? product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-contain p-2 transition duration-500 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <ImageFallback />
        )}
      </Link>

      {/* Info */}
      <div className={`flex flex-1 flex-col gap-3 p-4${isFeatured ? " items-center text-center" : ""}`}>
        <div className={`flex-1 space-y-0.5${isFeatured ? " text-center" : ""}`}>
          <Link href={href} className="block">
            <p className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight hover:text-primary transition-colors">
              {product.name}
            </p>
          </Link>
          <p className="text-xs text-muted-foreground">
            {product.category?.name ?? "Sin categoría"}
          </p>
        </div>

        <Price
          amount={product.price?.amount}
          currency={product.price?.currency ?? "COP"}
          className={`text-base font-bold tracking-tight${isFeatured ? " text-center" : ""}`}
        />

        {isFeatured ? (
          <Link
            href={href}
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Dar un vistazo
          </Link>
        ) : canAddToCart ? (
          <AddToCartButton
            productId={product.id}
            variantId={singleVariantId}
            disabled={!canAddToCart || (product.variants?.length ?? 0) > 1}
            disabledReason={
              (product.variants?.length ?? 0) > 1
                ? "Selecciona una variante en la página del producto."
                : null
            }
          />
        ) : (
          <Link
            href={href}
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {showNoStock ? "Sin stock" : "Ver producto"}
          </Link>
        )}
      </div>
    </div>
  );
}
