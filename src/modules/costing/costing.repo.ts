import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function getVariantAvgCost(
  variantId: bigint,
  branchId?: number,
  db: DbClient = prisma,
) {
  const rows = await db.$queryRaw<
    Array<{
      id: bigint;
      avg_cost: Prisma.Decimal;
      branch_id: number | null;
      updated_at: Date;
    }>
  >(Prisma.sql`
    SELECT id, avg_cost, branch_id, updated_at
    FROM inventory.variant_avg_cost
    WHERE variant_id = ${variantId}
      AND branch_id IS NOT DISTINCT FROM ${branchId ?? null}
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    avgCost: row.avg_cost,
    branchId: row.branch_id,
    updatedAt: row.updated_at,
  };
}

export async function getVariantAvgCostWithFallback(
  variantId: bigint,
  branchId?: number,
  db: DbClient = prisma,
) {
  if (typeof branchId === "number") {
    const branchCost = await getVariantAvgCost(variantId, branchId, db);
    if (branchCost) {
      return branchCost;
    }
  }

  return getVariantAvgCost(variantId, undefined, db);
}

export async function upsertVariantAvgCost(
  params: {
    variantId: bigint;
    branchId?: number;
    avgCost: Prisma.Decimal;
  },
  db: DbClient,
) {
  const existing = await db.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
    SELECT id
    FROM inventory.variant_avg_cost
    WHERE variant_id = ${params.variantId}
      AND branch_id IS NOT DISTINCT FROM ${params.branchId ?? null}
    LIMIT 1
  `);

  if (existing[0]) {
    const updated = await db.$queryRaw<
      Array<{ id: bigint; variant_id: bigint; branch_id: number | null; avg_cost: Prisma.Decimal; updated_at: Date }>
    >(Prisma.sql`
      UPDATE inventory.variant_avg_cost
      SET avg_cost = ${params.avgCost},
          updated_at = now()
      WHERE id = ${existing[0].id}
      RETURNING id, variant_id, branch_id, avg_cost, updated_at
    `);
    return updated[0];
  }

  const inserted = await db.$queryRaw<
    Array<{ id: bigint; variant_id: bigint; branch_id: number | null; avg_cost: Prisma.Decimal; updated_at: Date }>
  >(Prisma.sql`
    INSERT INTO inventory.variant_avg_cost (variant_id, branch_id, avg_cost, updated_at)
    VALUES (${params.variantId}, ${params.branchId ?? null}, ${params.avgCost}, now())
    RETURNING id, variant_id, branch_id, avg_cost, updated_at
  `);
  return inserted[0];
}

export async function getVariantStockOnHand(
  variantId: bigint,
  branchId?: number,
  db: DbClient = prisma,
) {
  const branchFilter =
    typeof branchId === "number"
      ? Prisma.sql`AND m.branch_id = ${branchId}`
      : Prisma.empty;

  const rows = await db.$queryRaw<Array<{ stock_on_hand: Prisma.Decimal | null }>>(Prisma.sql`
    SELECT
      COALESCE(SUM(
        CASE
          WHEN m.movement_type IN ('IN', 'RETURN_IN') THEN m.quantity
          WHEN m.movement_type IN ('OUT', 'RETURN_OUT') THEN -m.quantity
          WHEN m.movement_type = 'ADJUST' THEN m.quantity
          ELSE 0
        END
      ), 0) AS stock_on_hand
    FROM inventory.variant_inventory_movements m
    WHERE m.variant_id = ${variantId}
    ${branchFilter}
  `);

  return rows[0]?.stock_on_hand ?? new Prisma.Decimal(0);
}

export async function getLastInboundVariantUnitCost(
  variantId: bigint,
  branchId?: number,
  db: DbClient = prisma,
) {
  const branchFilter =
    typeof branchId === "number"
      ? Prisma.sql`AND m.branch_id = ${branchId}`
      : Prisma.empty;

  const rows = await db.$queryRaw<Array<{ unit_cost: Prisma.Decimal }>>(Prisma.sql`
    SELECT m.unit_cost
    FROM inventory.variant_inventory_movements m
    WHERE m.variant_id = ${variantId}
      AND m.movement_type IN ('IN', 'RETURN_IN')
      AND m.unit_cost >= 0
      ${branchFilter}
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 1
  `);

  return rows[0]?.unit_cost ?? null;
}
