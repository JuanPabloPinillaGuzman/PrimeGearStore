"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Bell, Box, ShoppingCart, TrendingUp } from "lucide-react";
import Link from "next/link";

import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

type DashboardData = {
  ordersToday: number;
  revenueToday: number;
  activeReservations: number;
  pendingOutbox: number;
  salesSeries: Array<{ date: string; revenue: number }>;
  recentOrders: Array<{
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
  }>;
};

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { month: "short", day: "numeric" });
}

const kpiConfig = [
  {
    key: "ordersToday" as const,
    label: "Pedidos hoy",
    icon: ShoppingCart,
    format: (v: number) => String(v),
    href: "/admin/orders",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    key: "revenueToday" as const,
    label: "Ventas hoy",
    icon: TrendingUp,
    format: formatCOP,
    href: "/admin/reports",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    key: "activeReservations" as const,
    label: "Reservas activas",
    icon: Box,
    format: (v: number) => String(v),
    href: "/admin/stock",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    key: "pendingOutbox" as const,
    label: "Notificaciones pendientes",
    icon: Bell,
    format: (v: number) => String(v),
    href: "/admin/fulfillment",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
];

function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 p-5">
      <Skeleton className="h-4 w-1/2 mb-4" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d: Partial<DashboardData>) =>
        setData({
          ordersToday: d.ordersToday ?? 0,
          revenueToday: d.revenueToday ?? 0,
          activeReservations: d.activeReservations ?? 0,
          pendingOutbox: d.pendingOutbox ?? 0,
          salesSeries: d.salesSeries ?? [],
          recentOrders: d.recentOrders ?? [],
        }),
      )
      .catch(() => {/* silently fail — show skeletons */})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiConfig.map((kpi) =>
          loading || !data ? (
            <KpiSkeleton key={kpi.key} />
          ) : (
            <Link
              key={kpi.key}
              href={kpi.href}
              className="group rounded-2xl border border-border/50 bg-card/80 p-5 transition-colors hover:bg-card hover:border-border"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                <div className={`flex size-8 items-center justify-center rounded-xl ${kpi.bg}`}>
                  <kpi.icon className={`size-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="font-display mt-3 text-2xl font-extrabold tracking-tight">
                {kpi.format(data[kpi.key])}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                Ver más <ArrowRight className="size-3" />
              </p>
            </Link>
          ),
        )}
      </section>

      {/* Chart + Recent orders */}
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* 7-day revenue chart */}
        <div className="rounded-2xl border border-border/50 bg-card/80 p-5">
          <p className="font-display mb-1 text-base font-semibold">Ventas — últimos 7 días</p>
          <p className="mb-5 text-xs text-muted-foreground">Revenue en COP por día</p>
          {loading || !data ? (
            <Skeleton className="h-52 w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.salesSeries} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}K`
                        : String(v)
                  }
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => [formatCOP(Number(value ?? 0)), "Revenue"]}
                  labelFormatter={(label) => formatShortDate(String(label))}
                  contentStyle={{
                    borderRadius: "0.75rem",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent orders */}
        <div className="rounded-2xl border border-border/50 bg-card/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-base font-semibold">Últimos pedidos</p>
            <Link
              href="/admin/orders"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Ver todos
            </Link>
          </div>

          {loading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : data.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay pedidos recientes.
            </p>
          ) : (
            <div className="space-y-2">
              {data.recentOrders.map((order) => (
                <Link
                  key={order.orderNumber}
                  href={`/admin/orders/${encodeURIComponent(order.orderNumber)}`}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-background/60 px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatShortDate(order.createdAt)}</p>
                  </div>
                  <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                    <AdminStatusBadge status={order.status} />
                    <p className="text-xs font-semibold">{formatCOP(order.total)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
