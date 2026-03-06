"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

function PendingContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="mb-8 flex size-24 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-100"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <Clock className="size-12 text-amber-500" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-3"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
          Pago en revisión
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Procesando tu pago
        </h1>
        <p className="mx-auto max-w-sm text-base text-muted-foreground">
          Tu pago está siendo verificado. Actualizaremos el estado de tu orden cuando Mercado Pago
          confirme el resultado. Esto puede tomar unos minutos.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="mt-10 flex flex-wrap justify-center gap-3"
      >
        <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
          <Link href={orderNumber ? `/orders/${encodeURIComponent(orderNumber)}` : "/account/orders"}>
            {orderNumber ? "Consultar orden" : "Mis órdenes"}
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/store">Seguir comprando</Link>
        </Button>
      </motion.div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense>
      <PendingContent />
    </Suspense>
  );
}
