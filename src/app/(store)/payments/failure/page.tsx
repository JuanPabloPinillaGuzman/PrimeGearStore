"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

function FailureContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="mb-8 flex size-24 items-center justify-center rounded-full bg-red-50 ring-8 ring-red-100"
      >
        <motion.div
          initial={{ rotate: -90, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
        >
          <XCircle className="size-12 text-red-500" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-3"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
          Pago rechazado
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          No pudimos procesar tu pago
        </h1>
        <p className="mx-auto max-w-sm text-base text-muted-foreground">
          Mercado Pago indicó un fallo. Verifica tus datos de pago e intenta nuevamente desde tu
          orden.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="mt-10 flex flex-wrap justify-center gap-3"
      >
        <Button asChild size="lg" className="rounded-full">
          <Link href={orderNumber ? `/orders/${encodeURIComponent(orderNumber)}` : "/account/orders"}>
            {orderNumber ? "Reintentar pago" : "Ver mis órdenes"}
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/store">Volver a la tienda</Link>
        </Button>
      </motion.div>
    </div>
  );
}

export default function PaymentFailurePage() {
  return (
    <Suspense>
      <FailureContent />
    </Suspense>
  );
}
