import Image from "next/image";

import { cn } from "@/lib/utils";

/** Logo-only mark (used on mobile / tight spaces). */
export function BrandLogo({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="PrimeGearStore"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority
    />
  );
}

/** Full brand mark: logo image + store name text as independent elements. */
export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <span
        className={cn("inline-flex items-center justify-center", className)}
        aria-label="PrimeGearStore"
      >
        <BrandLogo size={44} />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Logo image — independently sized, visually prominent */}
      <BrandLogo size={56} />
      {/* Store name — independently styled, unchanged text size */}
      <span className="text-base font-semibold tracking-[0.14em] text-foreground">
        PRIMEGEARSTORE
      </span>
    </span>
  );
}
