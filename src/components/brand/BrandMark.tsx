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
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-background text-xs font-semibold tracking-[0.14em] shadow-xs",
          className,
        )}
        aria-label="PrimeGearStore"
      >
        PG
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold tracking-[0.14em] text-primary-foreground shadow-sm">
        PG
      </span>
      <span className="text-sm font-semibold tracking-[0.14em] text-foreground">PRIMEGEARSTORE</span>
    </span>
  );
}
