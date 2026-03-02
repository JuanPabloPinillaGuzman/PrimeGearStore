import Link from "next/link";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/account", label: "Resumen" },
  { href: "/account/orders", label: "Mis pedidos" },
  { href: "/account/addresses", label: "Direcciones" },
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
    <main className="space-y-6">
      <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">Cuenta</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-border/70 bg-card/60 p-3 shadow-sm">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted/60",
                  )}
                >
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
