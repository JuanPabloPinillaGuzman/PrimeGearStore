import Link from "next/link";

import { BrandLogo } from "@/components/brand/BrandMark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      {/* Left branded panel — hidden on mobile */}
      <div className="relative hidden w-[45%] shrink-0 flex-col justify-between overflow-hidden bg-zinc-950 p-10 lg:flex">
        {/* Subtle gradient background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 10%, rgba(255,255,255,0.03) 0%, transparent 60%)",
          }}
        />

        {/* Logo */}
        <Link href="/" className="relative inline-flex items-center gap-3">
          <BrandLogo size={40} />
          <span className="text-sm font-semibold tracking-[0.18em] text-white/90">
            PRIMEGEARSTORE
          </span>
        </Link>

        {/* Tagline */}
        <div className="relative">
          <blockquote className="space-y-3">
            <p className="text-2xl font-semibold leading-snug text-white/90">
              Equipate con lo mejor.
            </p>
            <p className="text-sm leading-relaxed text-white/50">
              Productos seleccionados, entrega rápida y soporte cuando lo necesitas.
            </p>
          </blockquote>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 border-b border-border/50 px-5 py-4 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <BrandLogo size={28} />
            <span className="text-xs font-semibold tracking-[0.16em] text-foreground">
              PRIMEGEARSTORE
            </span>
          </Link>
        </div>

        {/* Scrollable form area */}
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
