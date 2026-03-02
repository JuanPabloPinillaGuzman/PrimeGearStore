import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const kpis = [
  { label: "Pedidos hoy", value: "TODO", description: "Conectar endpoint KPI si quieres métricas reales." },
  { label: "Ventas hoy", value: "TODO", description: "Disponible vía reportes; pendiente consolidar dashboard." },
  { label: "Reservas activas", value: "TODO", description: "Se puede exponer en /api/admin/dashboard." },
  { label: "Outbox pendientes", value: "TODO", description: "Útil para monitorear notificaciones." },
];

const quickLinks = [
  { href: "/admin/orders", label: "Gestionar pedidos" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/purchases", label: "Compras" },
  { href: "/admin/reports", label: "Reportes" },
  { href: "/admin/coupons", label: "Cupones" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardHeader className="gap-1">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl">{kpi.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
            <CardDescription>Acciones frecuentes del backoffice.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {quickLinks.map((item) => (
              <Button key={item.href} asChild variant="outline" className="justify-start">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximo paso</CardTitle>
            <CardDescription>Si quieres KPIs reales, agrega un endpoint agregado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>`GET /api/admin/dashboard` puede consolidar conteos y ventas del día.</p>
            <p>Por ahora el dashboard prioriza navegación y consistencia visual.</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
