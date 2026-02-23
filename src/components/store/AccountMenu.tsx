"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type MeResponse = {
  data: {
    email: string;
    name: string | null;
    role: string;
    customer: { id: number; fullName: string; email: string | null } | null;
  };
};

export function AccountMenu() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeResponse["data"] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/store/me", { cache: "no-store" });
        const payload = (await res.json()) as MeResponse | { error?: { code?: string } };
        if (!res.ok || !("data" in payload)) {
          if (!cancelled) setUser(null);
          return;
        }
        if (!cancelled) setUser(payload.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Button variant="outline" className="rounded-full" disabled>
        Cuenta
      </Button>
    );
  }

  if (!user) {
    return (
      <Button asChild variant="outline" className="rounded-full">
        <Link href="/api/auth/signin?callbackUrl=/account">Iniciar sesion</Link>
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="rounded-full"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Cuenta
      </Button>

      {open ? (
        <>
          <button
            className="fixed inset-0 z-40"
            type="button"
            aria-label="Cerrar menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-border/70 bg-background p-2 shadow-lg">
            <div className="mb-2 rounded-xl bg-muted/40 px-3 py-2">
              <p className="text-sm font-medium">{user.customer?.fullName ?? user.name ?? user.email}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <nav className="space-y-1 text-sm">
              <Link href="/account" className="block rounded-lg px-3 py-2 hover:bg-muted" onClick={() => setOpen(false)}>
                Resumen
              </Link>
              <Link href="/account/orders" className="block rounded-lg px-3 py-2 hover:bg-muted" onClick={() => setOpen(false)}>
                Mis pedidos
              </Link>
              <Link href="/account/addresses" className="block rounded-lg px-3 py-2 hover:bg-muted" onClick={() => setOpen(false)}>
                Direcciones
              </Link>
              <Link href="/api/auth/signout" className="block rounded-lg px-3 py-2 hover:bg-muted">
                Cerrar sesion
              </Link>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  );
}
