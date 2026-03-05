import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [ordersToday, revenueToday, activeReservations, pendingOutbox, dailySales, recentOrders] =
    await Promise.all([
      // Orders created today (excluding DRAFT/CANCELLED)
      prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM webstore.orders
        WHERE created_at >= CURRENT_DATE
          AND status::text NOT IN ('DRAFT', 'CANCELLED')
      `),

      // Revenue today (paid/in-progress orders)
      prisma.$queryRaw<[{ total: Prisma.Decimal | null }]>(Prisma.sql`
        SELECT COALESCE(SUM(total), 0) AS total
        FROM webstore.orders
        WHERE created_at >= CURRENT_DATE
          AND status::text IN ('PAID', 'PACKING', 'SHIPPED', 'DELIVERED')
      `),

      // Active stock reservations
      prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM webstore.stock_reservations
        WHERE status::text = 'ACTIVE'
      `),

      // Pending notification outbox
      prisma.$queryRaw<[{ count: bigint }]>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM webstore.notification_outbox
        WHERE sent_at IS NULL
          AND status::text = 'PENDING'
      `),

      // Last 7 days revenue by day
      prisma.$queryRaw<Array<{ day: Date; revenue: Prisma.Decimal }>>(Prisma.sql`
        SELECT
          DATE_TRUNC('day', created_at) AS day,
          COALESCE(SUM(total), 0) AS revenue
        FROM webstore.orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
          AND status::text IN ('PAID', 'PACKING', 'SHIPPED', 'DELIVERED')
        GROUP BY 1
        ORDER BY 1 ASC
      `),

      // 5 most recent non-draft orders
      prisma.$queryRaw<
        Array<{
          order_number: string;
          status: string;
          total: Prisma.Decimal;
          created_at: Date;
        }>
      >(Prisma.sql`
        SELECT order_number, status::text, total, created_at
        FROM webstore.orders
        WHERE status::text NOT IN ('DRAFT')
        ORDER BY created_at DESC
        LIMIT 5
      `),
    ]);

  // Build last-7-days series (fill missing days with 0)
  const today = new Date();
  const salesSeries = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const found = dailySales.find((r) => r.day.toISOString().slice(0, 10) === iso);
    return {
      date: iso,
      revenue: found ? Number(found.revenue) : 0,
    };
  });

  return NextResponse.json(
    {
      ordersToday: Number(ordersToday[0]?.count ?? 0),
      revenueToday: Number(revenueToday[0]?.total ?? 0),
      activeReservations: Number(activeReservations[0]?.count ?? 0),
      pendingOutbox: Number(pendingOutbox[0]?.count ?? 0),
      salesSeries,
      recentOrders: recentOrders.map((o) => ({
        orderNumber: o.order_number,
        status: o.status,
        total: Number(o.total),
        createdAt: o.created_at.toISOString(),
      })),
    },
    {
      headers: {
        // Fresh for 60 s, serve stale up to 5 min while revalidating in background
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
