import Image from "next/image";
import Link from "next/link";

import { Price } from "@/components/store/Price";
import { QuickViewDialog } from "@/components/store/QuickViewDialog";
import { WishlistButton } from "@/components/store/WishlistButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

type ProductCardProps = {
  product: {
    id: number;
    sku: string | null;
    slug: string | null;
    name: string;
    category: { id: number; name: string } | null;
    price: { amount: string; currency: string } | null;
    image: { url: string; alt: string | null } | null;
    variants?: Array<{ isInStock?: boolean }>;
  };
};

function resolveProductHref(product: ProductCardProps["product"]) {
  return product.slug ? `/products/${product.slug}` : `/store/products/${product.id}`;
}

function resolveStock(product: ProductCardProps["product"]) {
  if (!product.variants || product.variants.length === 0) return undefined;
  return product.variants.some((variant) => variant.isInStock !== false);
}

export function ProductCard({ product }: ProductCardProps) {
  const href = resolveProductHref(product);
  const hasPrice = !!product.price;
  const inStock = resolveStock(product);
  const showNoStock = inStock === false;

  return (
    <Card
      className="group gap-0 overflow-hidden border-border/80 bg-card/90 py-0 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5"
      data-testid={`product-card-${product.id}`}
    >
      <div className="relative">
        {product.image?.url ? (
          <Image
            src={product.image.url}
            alt={product.image.alt ?? product.name}
            width={640}
            height={480}
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="h-52 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-52 w-full items-center justify-center bg-gradient-to-br from-muted to-muted/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-xs font-semibold tracking-[0.18em] text-foreground/80 shadow-xs">
              PG
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {!hasPrice ? (
            <Badge variant="outline" className="bg-background/90">
              Sin precio
            </Badge>
          ) : null}
          {showNoStock ? (
            <Badge variant="secondary" className="bg-background/90 text-foreground">
              Sin stock
            </Badge>
          ) : null}
        </div>
        <div className="absolute right-3 top-3">
          <WishlistButton productId={product.id} slug={product.slug} productName={product.name} />
        </div>
      </div>

      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <p className="line-clamp-2 min-h-[2.75rem] text-sm font-medium leading-5 tracking-tight">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {product.category?.name ?? "Sin categoria"}
            {product.sku ? ` · ${product.sku}` : ""}
          </p>
        </div>

        <Price
          amount={product.price?.amount}
          currency={product.price?.currency ?? "COP"}
          className="text-base font-semibold tracking-tight"
        />
      </CardContent>

      <CardFooter className="grid grid-cols-1 gap-2 border-t border-border/60 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link href={href} prefetch>
              Ver
            </Link>
          </Button>
          <QuickViewDialog slug={product.slug} productName={product.name} />
        </div>
        <Button asChild variant="outline" className="flex-1">
          <Link href={href} prefetch>
            Detalles
          </Link>
        </Button>
        {hasPrice && !showNoStock ? (
          <Button asChild className="w-full">
            <Link href={href} prefetch>
              Agregar
            </Link>
          </Button>
        ) : (
          <Button className="w-full" disabled aria-disabled>
            Agregar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
