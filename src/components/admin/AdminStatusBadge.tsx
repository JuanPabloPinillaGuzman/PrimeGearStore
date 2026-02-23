import { Badge } from "@/components/ui/badge";

export function AdminStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return <Badge variant="outline">N/A</Badge>;
  }

  const normalized = status.toUpperCase();
  const variant =
    normalized === "PAID" || normalized === "DELIVERED" || normalized === "ACTIVE"
      ? "default"
    : normalized === "PENDING_PAYMENT" || normalized === "PACKING" || normalized === "SHIPPED"
      ? "secondary"
      : normalized === "CANCELLED" ||
          normalized === "DECLINED" ||
          normalized === "FAILED" ||
          normalized === "INACTIVE"
        ? "destructive"
        : "outline";

  return (
    <Badge variant={variant as "default" | "secondary" | "destructive" | "outline"}>
      {normalized}
    </Badge>
  );
}
