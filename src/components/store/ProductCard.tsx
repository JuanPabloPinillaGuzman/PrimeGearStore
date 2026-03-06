"use client";

import Image from "next/image";
import Link from "next/link";

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

export function ProductCard({ product, variant = "catalog" }: ProductCardProps) {
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

  return (
    <div className={`group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md hover:shadow-black/5${isFeatured ? " h-full" : ""}`}>
      {/* Image */}
      <Link href={href} className={`relative block overflow-hidden bg-muted/30${isFeatured ? " h-52 shrink-0" : " aspect-square"}`}>
        {product.image?.url ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-display text-xs font-bold tracking-[0.3em] text-muted-foreground/50">
              PG
            </span>
          </div>
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
