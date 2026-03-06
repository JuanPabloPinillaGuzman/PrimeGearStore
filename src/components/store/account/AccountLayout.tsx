import Link from "next/link";
import { LayoutDashboard, MapPin, Package } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/account", label: "Resumen", icon: LayoutDashboard },
  { href: "/account/orders", label: "Mis pedidos", icon: Package },
  { href: "/account/addresses", label: "Direcciones", icon: MapPin },
];

export function AccountLayout({
  children,
  pathname,
  title,
  description,
}: {
  children: ReactNode;
  pathname: string;
  title: string;
  description?: string;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-primary/70">
          Mi cuenta
        </p>
        <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-base text-muted-foreground">{description}</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        {/* Sidebar nav */}
        <aside>
          {/* Desktop sidebar */}
          <nav
            className="hidden space-y-1 lg:block"
            aria-label="Navegación de cuenta"
          >
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile tabs */}
          <nav
            className="flex gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-card/80 p-1.5 lg:hidden"
            aria-label="Navegación de cuenta"
          >
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
