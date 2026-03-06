"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="mb-8 flex size-24 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-100"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
        >
          <CheckCircle2 className="size-12 text-emerald-500" strokeWidth={1.5} />
        </motion.div>
      </motion.div>

      {/* Decorative circles */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {[80, 160, 240].map((size, i) => (
          <motion.div
            key={size}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.06 - i * 0.015 }}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
            className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500"
            style={{ width: size * 4, height: size * 4 }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-3"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          ¡Pago exitoso!
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Tu pedido está confirmado
        </h1>
        <p className="mx-auto max-w-sm text-base text-muted-foreground">
          Recibimos tu pago. Procesaremos tu orden y recibirás actualizaciones sobre el envío.
        </p>
        {orderNumber && (
          <p className="text-sm text-muted-foreground">
            Orden:{" "}
            <span className="font-display font-bold text-foreground">#{orderNumber}</span>
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="mt-10 flex flex-wrap justify-center gap-3"
      >
        <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
          <Link href={orderNumber ? `/orders/${encodeURIComponent(orderNumber)}` : "/account/orders"}>
            Ver mi orden
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/store">Seguir comprando</Link>
        </Button>
      </motion.div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
