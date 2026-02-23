"use client";

import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWishlist } from "@/components/store/hooks/useWishlist";
import { cn } from "@/lib/utils";

type Props = {
  productId?: number | null;
  slug?: string | null;
  productName?: string;
  className?: string;
  size?: "icon" | "icon-sm" | "icon-lg";
};

export function WishlistButton({ productId, slug, productName, className, size = "icon-sm" }: Props) {
  const { ready, has, toggle } = useWishlist();

  const disabled = (!slug && !productId) || !ready;
  const active = has({ slug, productId });

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn(
        "rounded-full bg-background/90 backdrop-blur",
        active && "border-rose-300 text-rose-600 hover:text-rose-700",
        className,
      )}
      aria-label={
        active
          ? `Quitar ${productName ?? "producto"} de favoritos`
          : `Agregar ${productName ?? "producto"} a favoritos`
      }
      title={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      onClick={() => {
        void toggle({ slug, productId });
      }}
      disabled={disabled}
    >
      <Heart className={cn("size-4", active && "fill-current")} />
    </Button>
  );
}
