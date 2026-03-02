import { cn } from "@/lib/utils";

type TimelineStep =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PACKING"
  | "SHIPPED"
  | "DELIVERED";

const ORDER_STEPS: TimelineStep[] = ["PENDING_PAYMENT", "PAID", "PACKING", "SHIPPED", "DELIVERED"];

function statusRank(status: string) {
  return ORDER_STEPS.indexOf(status as TimelineStep);
}

export function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const rank = statusRank(currentStatus);
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Estado del pedido</p>
      <div className="flex flex-wrap gap-2">
        {ORDER_STEPS.map((step, index) => {
          const reached = rank >= index;
          const active = currentStatus === step;
          return (
            <span
              key={step}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                reached
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
                active && "ring-2 ring-primary/25",
              )}
            >
              {step}
            </span>
          );
        })}
      </div>
    </div>
  );
}
