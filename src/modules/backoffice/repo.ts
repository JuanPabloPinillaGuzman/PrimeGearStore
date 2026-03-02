import { Prisma, StockMovementType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function findSupplierById(supplierId: number, db: DbClient = prisma) {
  return db.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true },
  });
}

export async function findProductsByIds(productIds: number[], db: DbClient = prisma) {
  return db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
}

export async function findVariantsByIds(variantIds: bigint[], db: DbClient = prisma) {
  return db.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, productId: true, isActive: true, name: true, sku: true },
  });
}

export async function createPurchaseHeader(
  data: {
    supplierId: number;
    branchId?: number;
    purchaseDate?: Date;
    currency: string;
    subtotal: Prisma.Decimal;
    taxTotal: Prisma.Decimal;
    total: Prisma.Decimal;
  },
  db: DbClient,
) {
  return db.purchase.create({
    data: {
      supplierId: data.supplierId,
      branchId: data.branchId,
      purchaseDate: data.purchaseDate,
      currency: data.currency,
      subtotal: data.subtotal,
      taxTotal: data.taxTotal,
      total: data.total,
    },
  });
}

export async function createPurchaseItems(
  data: Array<{
    purchaseId: bigint;
    productId: number;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }>,
  db: DbClient,
) {
  return db.purchaseItem.createMany({
    data: data.map((item) => ({
      purchaseId: item.purchaseId,
      productId: item.productId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      lineTotal: item.lineTotal,
    })),
  });
}

export async function createInventoryMovements(
  data: Array<{
    branchId?: number;
    productId: number;
    movementType: StockMovementType;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    referenceTable?: string;
    referenceId?: bigint;
  }>,
  db: DbClient,
) {
  return db.inventoryMovement.createMany({
    data: data.map((movement) => ({
      branchId: movement.branchId,
      productId: movement.productId,
      movementType: movement.movementType,
      quantity: movement.quantity,
      unitCost: movement.unitCost,
      referenceTable: movement.referenceTable,
      referenceId: movement.referenceId,
    })),
  });
}

export async function createVariantInventoryMovements(
  data: Array<{
    branchId?: number;
    variantId: bigint;
    movementType: StockMovementType;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
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
      unitCost: movement.unitCost,
      referenceTable: movement.referenceTable,
      referenceId: movement.referenceId,
    })),
  });
}

export async function createInventoryMovement(
  data: {
    branchId?: number;
    productId: number;
    movementType: StockMovementType;
    quantity: Prisma.Decimal;
    unitCost: Prisma.Decimal;
    referenceTable?: string;
  },
  db: DbClient = prisma,
) {
  return db.inventoryMovement.create({
    data: {
      branchId: data.branchId,
      productId: data.productId,
      movementType: data.movementType,
      quantity: data.quantity,
      unitCost: data.unitCost,
      referenceTable: data.referenceTable,
    },
  });
}

export async function queryInventoryStock(params: {
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
    conditions.push(Prisma.sql`(p.name ILIKE ${like} OR p.sku ILIKE ${like})`);
  }

  const whereSql =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<
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
    LIMIT ${params.limit}
    OFFSET ${params.offset}
  `);

  return rows;
}

export async function querySalesDaily(from: string, to: string) {
  return prisma.$queryRaw<
    Array<{
      day: Date;
      sales_count: bigint;
      sales_total: Prisma.Decimal;
    }>
  >(Prisma.sql`
    SELECT
      s.sale_date::date AS day,
      COUNT(*)::bigint AS sales_count,
      COALESCE(SUM(s.total), 0) AS sales_total
    FROM inventory.sales s
    WHERE s.sale_date::date BETWEEN ${from}::date AND ${to}::date
      AND s.status IN ('ISSUED', 'PAID')
    GROUP BY s.sale_date::date
    ORDER BY day ASC
  `);
}

export async function queryTopProducts(from: string, to: string, limit: number) {
  return prisma.$queryRaw<
    Array<{
      product_id: number;
      sku: string | null;
      name: string;
      quantity: Prisma.Decimal;
      total: Prisma.Decimal;
    }>
  >(Prisma.sql`
    SELECT
      si.product_id,
      p.sku,
      p.name,
      COALESCE(SUM(si.quantity), 0) AS quantity,
      COALESCE(SUM(si.line_total), 0) AS total
    FROM inventory.sale_items si
    INNER JOIN inventory.sales s ON s.id = si.sale_id
    INNER JOIN inventory.products p ON p.id = si.product_id
    WHERE s.sale_date::date BETWEEN ${from}::date AND ${to}::date
      AND s.status IN ('ISSUED', 'PAID')
    GROUP BY si.product_id, p.sku, p.name
    ORDER BY quantity DESC, total DESC
    LIMIT ${limit}
  `);
}

export async function queryProfitDaily(from: string, to: string) {
  return prisma.$queryRaw<
    Array<{
      day: Date;
      total_sales: Prisma.Decimal;
      total_cogs: Prisma.Decimal;
      gross_profit: Prisma.Decimal;
    }>
  >(Prisma.sql`
    WITH sales_daily AS (
      SELECT
        s.sale_date::date AS day,
        COALESCE(SUM(s.total), 0) AS total_sales
      FROM inventory.sales s
      WHERE s.sale_date::date BETWEEN ${from}::date AND ${to}::date
        AND s.status IN ('ISSUED', 'PAID')
      GROUP BY s.sale_date::date
    ),
    cogs_daily AS (
      SELECT
        s.sale_date::date AS day,
        COALESCE(SUM(si.quantity * si.unit_cost), 0) AS total_cogs
      FROM inventory.sale_items si
      INNER JOIN inventory.sales s ON s.id = si.sale_id
      WHERE s.sale_date::date BETWEEN ${from}::date AND ${to}::date
        AND s.status IN ('ISSUED', 'PAID')
      GROUP BY s.sale_date::date
    )
    SELECT
      COALESCE(sd.day, cd.day) AS day,
      COALESCE(sd.total_sales, 0) AS total_sales,
      COALESCE(cd.total_cogs, 0) AS total_cogs,
      COALESCE(sd.total_sales, 0) - COALESCE(cd.total_cogs, 0) AS gross_profit
    FROM sales_daily sd
    FULL OUTER JOIN cogs_daily cd ON cd.day = sd.day
    ORDER BY day ASC
  `);
}

export async function queryProfitTopVariants(from: string, to: string, limit: number) {
  return prisma.$queryRaw<
    Array<{
      variant_id: bigint;
      product_id: number;
      product_name: string;
      variant_name: string;
      variant_sku: string | null;
      quantity: Prisma.Decimal;
      total_sales: Prisma.Decimal;
      total_cogs: Prisma.Decimal;
      gross_profit: Prisma.Decimal;
    }>
  >(Prisma.sql`
    WITH sales_map AS (
      SELECT
        s.id AS sale_id,
        (substring(s.notes from 'webstore_order_id=([0-9]+);'))::bigint AS order_id
      FROM inventory.sales s
      WHERE s.sale_date::date BETWEEN ${from}::date AND ${to}::date
        AND s.status IN ('ISSUED', 'PAID')
        AND s.notes LIKE 'webstore_order_id=%'
    ),
    revenue_by_variant AS (
      SELECT
        oi.variant_id,
        COALESCE(SUM(oi.quantity), 0) AS quantity,
        COALESCE(SUM(oi.line_total), 0) AS total_sales
      FROM webstore.order_items oi
      INNER JOIN sales_map sm ON sm.order_id = oi.order_id
      WHERE oi.variant_id IS NOT NULL
      GROUP BY oi.variant_id
    ),
    cogs_by_variant AS (
      SELECT
        m.variant_id,
        COALESCE(SUM(m.quantity * m.unit_cost), 0) AS total_cogs
      FROM inventory.variant_inventory_movements m
      INNER JOIN sales_map sm ON sm.sale_id = m.reference_id
      WHERE m.reference_table = 'inventory.sales'
        AND m.movement_type = 'OUT'
      GROUP BY m.variant_id
    )
    SELECT
      v.id AS variant_id,
      p.id AS product_id,
      p.name AS product_name,
      v.name AS variant_name,
      v.sku AS variant_sku,
      COALESCE(r.quantity, 0) AS quantity,
      COALESCE(r.total_sales, 0) AS total_sales,
      COALESCE(c.total_cogs, 0) AS total_cogs,
      COALESCE(r.total_sales, 0) - COALESCE(c.total_cogs, 0) AS gross_profit
    FROM inventory.product_variants v
    INNER JOIN inventory.products p ON p.id = v.product_id
    LEFT JOIN revenue_by_variant r ON r.variant_id = v.id
    LEFT JOIN cogs_by_variant c ON c.variant_id = v.id
    WHERE COALESCE(r.quantity, 0) > 0 OR COALESCE(c.total_cogs, 0) > 0
    ORDER BY gross_profit DESC, total_sales DESC
    LIMIT ${limit}
  `);
}

export function withTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(callback);
}
