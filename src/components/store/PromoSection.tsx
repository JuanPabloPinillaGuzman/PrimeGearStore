"use client";

import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { motion } from "motion/react";

import { useScrollReveal } from "@/components/store/hooks/useScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PromoSection() {
  const [ref, visible] = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="w-full overflow-hidden" aria-label="Promoción de bienvenida">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-accent/30 to-background"
        >
          <div className="grid lg:grid-cols-2">
            {/* Left — copy */}
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <div className="flex items-center gap-2">
                <Badge className="gap-1.5 rounded-full">
                  <Tag className="size-3" />
                  Oferta de bienvenida
                </Badge>
              </div>

              <h2 className="font-display mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                10% off en tu primera compra
              </h2>

              <p className="mt-4 max-w-[40ch] text-base leading-relaxed text-muted-foreground">
                Usa el cupón{" "}
                <span className="font-display rounded-lg bg-primary/10 px-2 py-0.5 font-bold text-primary">
                  WELCOME10
                </span>{" "}
                al hacer checkout y obtén 10% de descuento en tu pedido.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20">
                  <Link href="/checkout">
                    Usar cupón ahora
                    <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <Link href="/store">Ver productos</Link>
                </Button>
              </div>

              <p className="mt-5 text-xs text-muted-foreground">
                También disponible:{" "}
                <span className="font-medium text-foreground">PRIMEGEAR5</span> — COP 5.000 fijo en
                compras mayores a $50.000.
              </p>
            </div>

            {/* Right — decorative grid */}
            <div className="relative hidden overflow-hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-l from-background/0 via-background/0 to-background/10" />
              <div className="grid h-full grid-cols-3 gap-3 p-8 opacity-60">
                {Array.from({ length: 9 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.1 + i * 0.04,
                      ease: "easeOut",
                    }}
                    className="rounded-2xl border border-primary/15 bg-primary/5"
                  />
                ))}
              </div>
              {/* Big tag icon */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Tag
                  className="size-24 text-primary/20"
                  strokeWidth={0.8}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
