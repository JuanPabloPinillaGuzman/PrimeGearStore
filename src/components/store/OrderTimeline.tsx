import { CheckCircle2, CreditCard, Package, PackageCheck, Truck } from "lucide-react";

import { cn } from "@/lib/utils";

type TimelineStep =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PACKING"
  | "SHIPPED"
  | "DELIVERED";

const STEPS: {
  key: TimelineStep;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "PENDING_PAYMENT",
    label: "Pendiente de pago",
    description: "Esperando confirmación del pago.",
    icon: CreditCard,
  },
  {
    key: "PAID",
    label: "Pago confirmado",
    description: "Tu pago fue procesado con éxito.",
    icon: CheckCircle2,
  },
  {
    key: "PACKING",
    label: "Preparando pedido",
    description: "Estamos empacando tu orden.",
    icon: Package,
  },
  {
    key: "SHIPPED",
    label: "En camino",
    description: "Tu pedido fue enviado.",
    icon: Truck,
  },
  {
    key: "DELIVERED",
    label: "Entregado",
    description: "¡Tu pedido llegó!",
    icon: PackageCheck,
  },
];

const ORDER_STEPS = STEPS.map((s) => s.key);

function statusRank(status: string) {
  return ORDER_STEPS.indexOf(status as TimelineStep);
}

export function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const rank = statusRank(currentStatus);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
        Estado del pedido
      </p>

      <div className="relative mt-4">
        {/* Connecting line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border/60" aria-hidden="true" />

        <ol className="space-y-0">
          {STEPS.map((step, index) => {
            const reached = rank >= index;
            const active = currentStatus === step.key;

            return (
              <li key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    reached
                      ? active
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                        : "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  <step.icon className="size-4" />
                  {/* Filled connector above */}
                  {index > 0 && reached && (
                    <div className="absolute bottom-full left-1/2 mb-0 h-6 w-px -translate-x-1/2 bg-primary/40" />
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1 pt-1.5">
                  <p
                    className={cn(
                      "text-sm font-semibold leading-tight",
                      reached ? "text-foreground" : "text-muted-foreground",
                      active && "text-primary",
                    )}
                  >
                    {step.label}
                  </p>
                  {(reached || active) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
