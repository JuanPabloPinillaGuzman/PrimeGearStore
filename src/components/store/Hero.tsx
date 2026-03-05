"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type FeaturedProduct = {
  id: number;
  slug: string | null;
  name: string;
  image: { url: string; alt: string | null } | null;
};

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: EASE },
});

export function Hero() {
  const [featured, setFeatured] = useState<FeaturedProduct | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/store/catalog?limit=1&sort=NEWEST", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as { data: { items: FeaturedProduct[] } };
        if (!cancelled && payload.data.items[0]) setFeatured(payload.data.items[0]);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative flex min-h-[92vh] w-full flex-col items-center justify-center overflow-hidden px-4 py-24">
      {/* Background gradient mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, var(--hero-gradient-start) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, oklch(0.65 0.18 260 / 6%) 0%, transparent 60%)",
        }}
      />
      {/* Decorative orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-1/4 h-80 w-80 rounded-full bg-primary/8 blur-3xl"
      />

      {/* Content */}
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
        <motion.p
          {...fadeUp(0)}
          className="font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80"
        >
          PrimeGearStore
        </motion.p>

        <motion.h1
          {...fadeUp(0.1)}
          className="font-display mt-6 max-w-[18ch] text-balance text-5xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
        >
          Equipamiento que define tu estilo
        </motion.h1>

        <motion.p
          {...fadeUp(0.2)}
          className="mt-6 max-w-[52ch] text-balance text-lg leading-relaxed text-muted-foreground"
        >
          Selección curada de productos premium con diseño excepcional. Compra simple, entrega rápida,
          experiencia de categoría superior.
        </motion.p>

        <motion.div {...fadeUp(0.32)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-8 shadow-lg shadow-primary/25">
            <Link href="/store">
              Explorar tienda
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="group rounded-full px-8">
            <Link href="/store?sort=NEWEST">
              Novedades
              <ArrowRight className="ml-1.5 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </motion.div>

        {/* Featured product preview */}
        {featured?.image?.url && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
            className="mt-16 w-full max-w-2xl"
          >
            <Link
              href={featured.slug ? `/products/${featured.slug}` : `/products/${featured.id}`}
              className="group relative block overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-2xl shadow-black/10 backdrop-blur-sm transition hover:shadow-black/15"
            >
              <Image
                src={featured.image.url}
                alt={featured.image.alt ?? featured.name}
                width={800}
                height={500}
                className="h-72 w-full object-cover transition duration-500 group-hover:scale-[1.02] sm:h-96"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                  Destacado
                </p>
                <p className="mt-1 font-display text-xl font-bold text-white">{featured.name}</p>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Stats row */}
        <motion.div
          {...fadeUp(0.45)}
          className="mt-14 grid grid-cols-2 gap-x-10 gap-y-5 sm:grid-cols-4"
        >
          {[
            ["27+", "Productos"],
            ["Rápida", "Entrega"],
            ["Seguro", "Mercado Pago"],
            ["100%", "Stock validado"],
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <p className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                {value}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
