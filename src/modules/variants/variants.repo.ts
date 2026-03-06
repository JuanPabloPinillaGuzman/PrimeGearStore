import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function findProductForVariant(productId: number, db: DbClient = prisma) {
  return db.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });
}

export async function listVariantsByProduct(productId: number, db: DbClient = prisma) {
  return db.productVariant.findMany({
    where: { productId },
    orderBy: { id: "asc" },
  });
}

export async function findVariantByIdForProduct(
  productId: number,
  variantId: bigint,
  db: DbClient = prisma,
) {
  return db.productVariant.findFirst({
    where: {
      id: variantId,
      productId,
    },
  });
}

export async function findVariantById(variantId: bigint, db: DbClient = prisma) {
  return db.productVariant.findUnique({
    where: { id: variantId },
  });
}

export async function createVariant(
  data: {
    productId: number;
    sku?: string;
    name: string;
    attributes: Prisma.InputJsonValue;
    isActive?: boolean;
  },
  db: DbClient = prisma,
) {
  return db.productVariant.create({
    data: {
      productId: data.productId,
      sku: data.sku,
      name: data.name,
      attributes: data.attributes,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateVariant(
  variantId: bigint,
  data: {
    sku?: string;
    name?: string;
    attributes?: Prisma.InputJsonValue;
    isActive?: boolean;
  },
  db: DbClient = prisma,
) {
  return db.productVariant.update({
    where: { id: variantId },
    data,
  });
}

export async function deleteVariant(variantId: bigint, db: DbClient = prisma) {
  return db.productVariant.delete({
    where: { id: variantId },
  });
}

export async function listVariantPrices(variantId: bigint, db: DbClient = prisma) {
  return db.variantPrice.findMany({
    where: { variantId },
    orderBy: [{ validFrom: "desc" }, { id: "desc" }],
    include: {
      priceList: {
        select: {
          id: true,
          name: true,
          isDefault: true,
        },
      },
    },
  });
}

export async function getVariantStockOnHandMap(
  variantIds: bigint[],
  params?: { branchId?: number },
  db: DbClient = prisma,
) {
  if (variantIds.length === 0) {
    return new Map<string, Prisma.Decimal>();
  }

  const whereBranch =
    typeof params?.branchId === "number"
      ? Prisma.sql`AND m.branch_id = ${params.branchId}`
      : Prisma.empty;

  const rows = await db.$queryRaw<
    Array<{
      variant_id: bigint;
      stock_on_hand: Prisma.Decimal;
    }>
  >(Prisma.sql`
    SELECT
      m.variant_id,
      SUM(
        CASE
          WHEN m.movement_type IN ('IN','RETURN_IN') THEN m.quantity
          WHEN m.movement_type IN ('OUT','RETURN_OUT') THEN -m.quantity
          WHEN m.movement_type = 'ADJUST' THEN m.quantity
          ELSE 0
        END
      ) AS stock_on_hand
    FROM inventory.variant_inventory_movements m
    WHERE m.variant_id IN (${Prisma.join(variantIds)})
    ${whereBranch}
    GROUP BY m.variant_id
  `);

  return new Map(rows.map((row) => [row.variant_id.toString(), row.stock_on_hand]));
}

export async function getActiveReservedVariantQtyMap(
  variantIds: bigint[],
  params?: { branchId?: number; excludeOrderId?: bigint },
  db: DbClient = prisma,
) {
  if (variantIds.length === 0) {
    return new Map<string, Prisma.Decimal>();
  }

  const whereBranch =
    typeof params?.branchId === "number"
      ? Prisma.sql`AND r.branch_id = ${params.branchId}`
      : Prisma.empty;
  const excludeOrder =
    typeof params?.excludeOrderId === "bigint"
      ? Prisma.sql`AND r.order_id <> ${params.excludeOrderId}`
      : Prisma.empty;

  const now = new Date();
  const rows = await db.$queryRaw<
    Array<{
      variant_id: bigint;
      reserved_qty: Prisma.Decimal;
    }>
  >(Prisma.sql`
    SELECT
      r.variant_id,
      COALESCE(SUM(r.quantity), 0) AS reserved_qty
    FROM webstore.stock_reservations r
    WHERE r.variant_id IN (${Prisma.join(variantIds)})
      AND r.status = 'ACTIVE'
      AND r.expires_at > ${now}
      AND r.variant_id IS NOT NULL
      ${whereBranch}
      ${excludeOrder}
    GROUP BY r.variant_id
  `);

  return new Map(rows.map((row) => [row.variant_id.toString(), row.reserved_qty]));
}

export async function createVariantInventoryMovements(
  data: Array<{
    branchId?: number;
    variantId: bigint;
    movementType: "OUT" | "IN" | "ADJUST" | "RETURN_IN" | "RETURN_OUT";
    quantity: Prisma.Decimal;
    unitCost?: Prisma.Decimal;
    referenceTable?: string;
    referenceId?: bigint;
  }>,
  db: DbClient,
) {
  return db.variantInventoryMovement.createMany({
    data: data.map((movement) => ({
      branchId: movement.branchId,
      variantId: movement.variantId,
      movementType: movement.movementType,
      quantity: movement.quantity,
      unitCost: movement.unitCost ?? new Prisma.Decimal(0),
      referenceTable: movement.referenceTable,
      referenceId: movement.referenceId,
    })),
  });
}

export async function createVariantPrice(
  data: {
    variantId: bigint;
    priceListId: number;
    salePrice: Prisma.Decimal;
    currency: string;
    validFrom?: Date;
    validTo?: Date | null;
  },
  db: DbClient = prisma,
) {
  return db.variantPrice.create({
    data: {
      variantId: data.variantId,
      priceListId: data.priceListId,
      salePrice: data.salePrice,
      currency: data.currency,
      validFrom: data.validFrom,
      validTo: data.validTo,
    },
  });
}

export async function queryVariantStock(params: {
  branchId?: number;
  search?: string;
  limit: number;
  offset: number;
}) {
  const conditions: Prisma.Sql[] = [];
  if (typeof params.branchId === "number") {
    conditions.push(Prisma.sql`m.branch_id = ${params.branchId}`);
  }
  if (params.search) {
    const like = `%${params.search}%`;
    conditions.push(
      Prisma.sql`(p.name ILIKE ${like} OR p.sku ILIKE ${like} OR v.name ILIKE ${like} OR v.sku ILIKE ${like})`,
    );
  }
  const whereSql =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  return prisma.$queryRaw<
    Array<{
      variant_id: bigint;
      product_id: number;
      product_name: string;
      product_sku: string | null;
      variant_name: string;
      variant_sku: string | null;
      branch_id: number | null;
      stock_on_hand: Prisma.Decimal;
    }>
  >(Prisma.sql`
    SELECT
      v.id AS variant_id,
      p.id AS product_id,
      p.name AS product_name,
      p.sku AS product_sku,
      v.name AS variant_name,
      v.sku AS variant_sku,
      m.branch_id,
      SUM(
        CASE
          WHEN m.movement_type IN ('IN','RETURN_IN') THEN m.quantity
          WHEN m.movement_type IN ('OUT','RETURN_OUT') THEN -m.quantity
          WHEN m.movement_type = 'ADJUST' THEN m.quantity
          ELSE 0
        END
      ) AS stock_on_hand
    FROM inventory.variant_inventory_movements m
    INNER JOIN inventory.product_variants v ON v.id = m.variant_id
    INNER JOIN inventory.products p ON p.id = v.product_id
    ${whereSql}
    GROUP BY v.id, p.id, p.name, p.sku, v.name, v.sku, m.branch_id
    ORDER BY p.name ASC, v.name ASC, m.branch_id ASC
    LIMIT ${params.limit}
    OFFSET ${params.offset}
  `);
}
