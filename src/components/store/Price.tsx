import { formatCOP } from "@/lib/format/currency";

type PriceProps = {
  amount?: string | number | null;
  currency?: string | null;
  className?: string;
  emptyLabel?: string;
};

export function Price({
  amount,
  currency = "COP",
  className,
  emptyLabel = "Sin precio",
}: PriceProps) {
  if (amount === null || amount === undefined) {
    return <span className={className}>{emptyLabel}</span>;
  }

  return <span className={className}>{formatCOP(amount, currency ?? "COP")}</span>;
}
