import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function queryOrdersCsv(from: string, to: string) {
  return prisma.$queryRaw<
    Array<{
      order_number: string;
      status: string;
      currency: string;
      total: Prisma.Decimal;
      created_at: Date;
      payment_status: string | null;
      sale_id: bigint | null;
    }>
  >(Prisma.sql`
    SELECT
      o.order_number,
      o.status::text AS status,
      o.currency,
      o.total,
      o.created_at,
      p.status::text AS payment_status,
      s.id AS sale_id
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
    WHERE o.created_at::date BETWEEN ${from}::date AND ${to}::date
    ORDER BY o.created_at ASC
  `);
}

export async function querySalesCsv(from: string, to: string) {
  return prisma.$queryRaw<
    Array<{
      sale_id: bigint;
      sale_date: Date;
      status: string;
      currency: string;
      subtotal: Prisma.Decimal;
      tax_total: Prisma.Decimal;
      total: Prisma.Decimal;
      customer_id: number | null;
      branch_id: number | null;
      notes: string | null;
    }>
  >(Prisma.sql`
    SELECT
      s.id AS sale_id,
      s.sale_date,
      s.status::text AS status,
      s.currency,
      s.subtotal,
      s.tax_total,
      s.total,
      s.customer_id,
      s.branch_id,
      s.notes
    FROM inventory.sales s
    WHERE s.sale_date::date BETWEEN ${from}::date AND ${to}::date
    ORDER BY s.sale_date ASC, s.id ASC
  `);
}

export async function queryStockCsv(branchId?: number) {
  const whereSql =
    typeof branchId === "number" ? Prisma.sql`WHERE m.branch_id = ${branchId}` : Prisma.empty;

  return prisma.$queryRaw<
    Array<{
      product_id: number;
      sku: string | null;
      name: string;
      branch_id: number | null;
      stock_on_hand: Prisma.Decimal;
    }>
  >(Prisma.sql`
    SELECT
      p.id AS product_id,
      p.sku,
      p.name,
      m.branch_id,
      SUM(
        CASE
          WHEN m.movement_type IN ('IN', 'RETURN_IN') THEN m.quantity
          WHEN m.movement_type IN ('OUT', 'RETURN_OUT') THEN -m.quantity
          WHEN m.movement_type = 'ADJUST' THEN m.quantity
          ELSE 0
        END
      ) AS stock_on_hand
    FROM inventory.inventory_movements m
    INNER JOIN inventory.products p ON p.id = m.product_id
    ${whereSql}
    GROUP BY p.id, p.sku, p.name, m.branch_id
    ORDER BY p.name ASC, m.branch_id ASC
  `);
}

