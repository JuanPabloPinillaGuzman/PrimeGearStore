type PriceProps = {
  amount?: string | number | null;
  currency?: string | null;
  className?: string;
  emptyLabel?: string;
};

function formatCurrency(amount: string | number, currency: string) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return `${currency} ${amount}`;

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function Price({
  amount,
  currency = "COP",
  className,
  emptyLabel = "Sin precio",
}: PriceProps) {
  if (amount === null || amount === undefined) {
    return <span className={className}>{emptyLabel}</span>;
  }

  return <span className={className}>{formatCurrency(amount, currency ?? "COP")}</span>;
}
