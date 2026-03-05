import Image from "next/image";

import { cn } from "@/lib/utils";

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
        <Image src="/logo.png" alt="PrimeGearStore" width={32} height={32} className="object-contain" priority />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image src="/logo.png" alt="PrimeGearStore" width={32} height={32} className="object-contain" priority />
      <span className="text-sm font-semibold tracking-[0.14em] text-foreground">PRIMEGEARSTORE</span>
    </span>
  );
}
