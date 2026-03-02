import Link from "next/link";

import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-32 w-1/2 bg-gradient-to-r from-primary/5 to-transparent" />
        <svg
          aria-hidden="true"
          className="absolute right-4 top-4 hidden h-28 w-28 text-primary/15 sm:block"
          viewBox="0 0 120 120"
          fill="none"
        >
          <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="1.5" />
          <path d="M22 68c18-24 58-26 76-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M28 84c18-16 42-16 64-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            PrimeGearStore
          </p>
          <h1 className="mt-3 max-w-[16ch] text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Equipamiento premium para tu día a día
          </h1>
          <p className="mt-4 max-w-[52ch] text-sm leading-6 text-muted-foreground sm:text-base">
            Selección curada de productos con enfoque en diseño, durabilidad y compra simple.
            Explora destacados, categorías y promociones activas.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="rounded-full">
              <Link href="#catalogo">Ver catálogo</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="#promociones">Ver promociones</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/70 p-5 shadow-xs">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Entrega", "Rápida y segura"],
              ["Stock", "Validación en checkout"],
              ["Pagos", "Mercado Pago"],
              ["Soporte", "Backoffice integrado"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/60 bg-card/80 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-medium tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
