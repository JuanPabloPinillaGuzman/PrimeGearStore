"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/store/EmptyState";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { Price } from "@/components/store/Price";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type MeOrder = {
  orderNumber: string;
  status: string;
  total: string;
  currency: string;
  createdAt: string;
  paymentStatus: string | null;
};

type MeOrdersResponse = {
  data: {
    items: MeOrder[];
  };
};

export function OrdersList() {
  const [items, setItems] = useState<MeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/store/me/orders?limit=20&offset=0", { cache: "no-store" });
        const payload = (await response.json()) as MeOrdersResponse | { error?: { message?: string } };
        if (!response.ok || !("data" in payload)) {
          throw new Error(("error" in payload && payload.error?.message) || "No fue posible cargar pedidos.");
        }
        if (!cancelled) setItems(payload.data.items);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "No fue posible cargar pedidos.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (error) {
    return <EmptyState title="No pudimos cargar tus pedidos" description={error} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Aún no tienes pedidos"
        description="Cuando completes tu primera compra, aparecerá aquí."
        actionLabel="Ir a la tienda"
        onAction={() => (window.location.href = "/store")}
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.orderNumber} className="py-0">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium tracking-tight">{item.orderNumber}</p>
                <AdminStatusBadge status={item.status} />
                {item.paymentStatus ? <AdminStatusBadge status={item.paymentStatus} /> : null}
              </div>
              <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("es-CO")}</p>
              <Price amount={item.total} currency={item.currency} className="text-sm font-semibold" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/orders/${item.orderNumber}`}>Ver estado</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={`/account/orders/${item.orderNumber}`}>Detalle</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
