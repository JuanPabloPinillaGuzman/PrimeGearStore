"use client";

import Link from "next/link";
import { ChevronDown, CreditCard, Minus, Package, Plus, RotateCcw, Truck } from "lucide-react";
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
    description?: string | null;
    features?: Array<{ key: string; value: string }> | null;
    paymentMethods?: string[] | null;
  };
};

const PAYMENT_METHOD_DEFS = [
  {
    id: "mercadopago",
    label: "Mercado Pago",
    icon: CreditCard,
  },
  {
    id: "contraentrega",
    label: "Contraentrega",
    icon: Truck,
  },
];

const STATIC_ACCORDIONS = [
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
  children,
}: {
  icon: typeof Package;
  label: string;
  children: React.ReactNode;
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
            <div className="pb-4">{children}</div>
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
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0] ?? null,
    [product.variants, selectedVariantId],
  );

  const activePrice = selectedVariant?.price ?? product.price ?? null;
  const hasVariants = product.variants.length > 0;
  const inStock = hasVariants ? (selectedVariant?.isInStock ?? false) : true;

  const maxQty = useMemo(() => {
    if (hasVariants && selectedVariant?.availableToSell) {
      const parsed = parseInt(selectedVariant.availableToSell, 10);
      return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
    }
    return 99;
  }, [hasVariants, selectedVariant]);

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

  const enabledPaymentMethods = useMemo(() => {
    if (!product.paymentMethods || product.paymentMethods.length === 0) {
      return PAYMENT_METHOD_DEFS;
    }
    return PAYMENT_METHOD_DEFS.filter((def) => product.paymentMethods!.includes(def.id));
  }, [product.paymentMethods]);

  const hasDescription = !!product.description?.trim();
  const hasFeatures = product.features && product.features.length > 0;

  return (
    <section className="space-y-6">
      {/* Category */}
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

      {/* Payment methods */}
      {enabledPaymentMethods.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {enabledPaymentMethods.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className="flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground/70"
            >
              <Icon className="size-3.5 text-primary/60" />
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Variant selector */}
      {hasVariants && (
        <VariantSelector
          variants={product.variants}
          selectedId={selectedVariant?.id ?? null}
          onChange={(id) => {
            setSelectedVariantId(id);
            setQuantity(1);
          }}
        />
      )}

      {/* Quantity selector */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Cantidad</p>
        <div className="flex items-center gap-0 overflow-hidden rounded-xl border border-border/70 w-fit">
          <button
            type="button"
            aria-label="Reducir cantidad"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground transition hover:bg-muted/60 disabled:opacity-40"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="flex h-10 min-w-10 items-center justify-center border-x border-border/70 px-3 text-sm font-semibold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Aumentar cantidad"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            className="flex h-10 w-10 items-center justify-center text-muted-foreground transition hover:bg-muted/60 disabled:opacity-40"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Add to cart */}
      <div className="space-y-3 pt-1">
        <AddToCartButton
          productId={product.id}
          variantId={selectedVariant?.id ?? null}
          quantity={quantity}
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
        {hasDescription && (
          <AccordionItem icon={Package} label="Descripción del producto">
            <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          </AccordionItem>
        )}

        {hasFeatures && (
          <AccordionItem icon={Package} label="Características">
            <ul className="space-y-1.5">
              {product.features!.map((feat, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="min-w-0 font-medium text-foreground/80">{feat.key}:</span>
                  <span className="text-muted-foreground">{feat.value}</span>
                </li>
              ))}
            </ul>
          </AccordionItem>
        )}

        {STATIC_ACCORDIONS.map((item) => (
          <AccordionItem key={item.id} icon={item.icon} label={item.label}>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.content}</p>
          </AccordionItem>
        ))}
      </div>
    </section>
  );
}
