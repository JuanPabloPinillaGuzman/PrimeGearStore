"use client";

import Link from "next/link";
import { ChevronDown, Package, RotateCcw, Truck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";

import { AddToCartButton } from "@/components/store/AddToCartButton";
import { Price } from "@/components/store/Price";
import { VariantSelector } from "@/components/store/VariantSelector";
import { WishlistButton } from "@/components/store/WishlistButton";
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

const ACCORDION_ITEMS = [
  {
    id: "details",
    icon: Package,
    label: "Detalles del producto",
    content:
      "Producto de alta calidad fabricado con los mejores materiales. Diseñado para ofrecer la mejor experiencia de uso y durabilidad prolongada.",
  },
  {
    id: "shipping",
    icon: Truck,
    label: "Envío",
    content:
      "Envío a todo el país. Despacho en 1–3 días hábiles tras la confirmación del pago. Seguimiento disponible en tu cuenta.",
  },
  {
    id: "returns",
    icon: RotateCcw,
    label: "Devoluciones",
    content:
      "Aceptamos devoluciones dentro de los 30 días de recibido el pedido, siempre que el producto esté en su estado original.",
  },
];

function AccordionItem({
  icon: Icon,
  label,
  content,
}: {
  icon: typeof Package;
  label: string;
  content: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{content}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
    <section className="space-y-6">
      {/* Breadcrumb / Category */}
      {product.category && (
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
          {product.category.name}
        </p>
      )}

      {/* Title + wishlist */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {product.name}
        </h1>
        <WishlistButton
          productId={product.id}
          slug={product.slug}
          productName={product.name}
          size="icon"
        />
      </div>

      {/* SKU */}
      <p className="text-xs text-muted-foreground">
        SKU: {selectedVariant?.sku ?? product.sku ?? "N/A"}
      </p>

      {/* Price + stock */}
      <div className="space-y-1.5">
        <Price
          amount={activePrice?.amount}
          currency={activePrice?.currency ?? "COP"}
          className="font-display text-3xl font-extrabold tracking-tight"
        />
        {hasVariants && selectedVariant && (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                inStock ? "bg-emerald-500" : "bg-red-500",
              )}
            />
            <span className={cn("text-sm", inStock ? "text-emerald-700" : "text-red-600")}>
              {inStock
                ? `En stock${selectedVariant.availableToSell ? ` · ${selectedVariant.availableToSell} unidades` : ""}`
                : "Sin stock en esta variante"}
            </span>
          </div>
        )}
        {!activePrice && (
          <p className="text-sm text-muted-foreground">Sin precio configurado.</p>
        )}
      </div>

      {/* Variant selector */}
      {hasVariants && (
        <VariantSelector
          variants={product.variants}
          selectedId={selectedVariant?.id ?? null}
          onChange={setSelectedVariantId}
        />
      )}

      {/* Add to cart */}
      <div className="space-y-3 pt-1">
        <AddToCartButton
          productId={product.id}
          variantId={selectedVariant?.id ?? null}
          disabled={!!disabledReason}
          disabledReason={disabledReason}
        />
        <Link
          href="/checkout"
          className="block text-center text-sm text-muted-foreground hover:text-primary"
        >
          Ir directo a checkout →
        </Link>
      </div>

      {/* Accordion info */}
      <div className="rounded-2xl border border-border/60 px-4 pt-1">
        {ACCORDION_ITEMS.map((item) => (
          <AccordionItem key={item.id} icon={item.icon} label={item.label} content={item.content} />
        ))}
      </div>
    </section>
  );
}
