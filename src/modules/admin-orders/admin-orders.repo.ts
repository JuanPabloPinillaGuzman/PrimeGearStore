import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function listOrders(params: {
  search?: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  const conditions: Prisma.Sql[] = [];

  if (params.search) {
    const like = `%${params.search}%`;
    conditions.push(Prisma.sql`o.order_number ILIKE ${like}`);
  }

  if (params.status) {
    conditions.push(Prisma.sql`o.status::text = ${params.status}`);
  }

  const whereSql =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  return prisma.$queryRaw<
    Array<{
      order_number: string;
      status: string;
      total: Prisma.Decimal;
      created_at: Date;
      payment_status: string | null;
      sale_id: bigint | null;
      converted: boolean;
    }>
  >(Prisma.sql`
    SELECT
      o.order_number,
      o.status::text,
      o.total,
      o.created_at,
      p.status::text AS payment_status,
      s.id AS sale_id,
      (s.id IS NOT NULL) AS converted
    FROM webstore.orders o
    LEFT JOIN LATERAL (
      SELECT op.status
      FROM webstore.order_payments op
      WHERE op.order_id = o.id
      ORDER BY op.created_at DESC
      LIMIT 1
    ) p ON TRUE
    LEFT JOIN inventory.sales s
      ON s.notes LIKE ('%webstore_order_id=' || o.id::text || ';%')
    ${whereSql}
    ORDER BY o.created_at DESC
    LIMIT ${params.limit}
    OFFSET ${params.offset}
  `);
}

export async function getOrderDetail(orderNumber: string) {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        orderBy: {
          id: "asc",
        },
      },
      stockReservations: {
        orderBy: {
          id: "asc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
      shipments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function getSaleByOrderId(orderId: bigint) {
  return prisma.sale.findFirst({
    where: {
      notes: {
        contains: `webstore_order_id=${orderId.toString()};`,
      },
    },
    orderBy: {
      saleDate: "desc",
    },
  });
}
