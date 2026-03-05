import { Prisma, StockMovementType } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { updateVariantAverageCostForInbound } from "@/modules/costing/costing.service";
import type {
  CreatePurchaseInputDto,
  CreatePurchaseOutputDto,
  InventoryAdjustInputDto,
  InventoryAdjustOutputDto,
  InventoryStockOutputDto,
  ProfitDailyItemDto,
  ProfitDailyQueryDto,
  ProfitTopVariantItemDto,
  ProfitTopVariantsQueryDto,
  SalesDailyItemDto,
  SalesDailyQueryDto,
  TopProductItemDto,
  TopProductsQueryDto,
} from "@/modules/backoffice/backoffice.dto";
import {
  createInventoryMovement,
  createInventoryMovements,
  createVariantInventoryMovements,
  createPurchaseHeader,
  createPurchaseItems,
  findProductsByIds,
  findSupplierById,
  findVariantsByIds,
  queryInventoryStock,
  queryProfitDaily,
  queryProfitTopVariants,
  querySalesDaily,
  queryTopProducts,
  withTransaction,
} from "@/modules/backoffice/backoffice.repo";

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function buildAdjustReferenceTable(reason?: string) {
  const base = "ADJUST";
  if (!reason) {
    return base;
  }

  const compactReason = reason.trim().replace(/\s+/g, " ");
  const composed = `${base}: ${compactReason}`;
  return composed.slice(0, 40);
}

export async function createPurchase(input: CreatePurchaseInputDto): Promise<CreatePurchaseOutputDto> {
  return withTransaction(async (tx) => {
    const supplier = await findSupplierById(input.supplierId, tx);
    if (!supplier) {
      throw new AppError("NOT_FOUND", 404, "Supplier not found.");
    }

    const normalizedItems = input.items.map((item) => ({
      ...item,
      variantId:
        item.variantId === undefined
          ? undefined
          : typeof item.variantId === "number"
            ? BigInt(item.variantId)
            : BigInt(item.variantId),
    }));

    const uniqueProductIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const products = await findProductsByIds(uniqueProductIds, tx);
    if (products.length !== uniqueProductIds.length) {
      throw new AppError("NOT_FOUND", 404, "One or more products were not found.");
    }

    const uniqueVariantIds = [
      ...new Set(
        normalizedItems
          .map((item) => item.variantId)
          .filter((variantId): variantId is bigint => typeof variantId === "bigint")
          .map((variantId) => variantId.toString()),
      ),
    ].map((id) => BigInt(id));

    const variants =
      uniqueVariantIds.length > 0 ? await findVariantsByIds(uniqueVariantIds, tx) : [];
    if (variants.length !== uniqueVariantIds.length) {
      throw new AppError("NOT_FOUND", 404, "One or more variants were not found.");
    }
    const variantById = new Map(variants.map((variant) => [variant.id.toString(), variant]));
    for (const item of normalizedItems) {
      if (!item.variantId) continue;
      const variant = variantById.get(item.variantId.toString());
      if (!variant || variant.productId !== item.productId) {
        throw new AppError("UNPROCESSABLE", 422, "Variant does not belong to the specified product.");
      }
    }

    const subtotal = normalizedItems.reduce((acc, item) => {
      return acc.plus(toDecimal(item.quantity).times(toDecimal(item.unitCost)));
    }, new Prisma.Decimal(0));

    const taxTotal = new Prisma.Decimal(0);
    const total = subtotal.plus(taxTotal);

    const purchase = await createPurchaseHeader(
      {
        supplierId: input.supplierId,
        branchId: input.branchId,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
        currency: input.currency ?? "COP",
        subtotal,
        taxTotal,
        total,
      },
      tx,
    );

    await createPurchaseItems(
      normalizedItems.map((item) => {
        const quantity = toDecimal(item.quantity);
        const unitCost = toDecimal(item.unitCost);
        return {
          purchaseId: purchase.id,
          productId: item.productId,
          quantity,
          unitCost,
          lineTotal: quantity.times(unitCost),
        };
      }),
      tx,
    );

    const variantItems = normalizedItems.filter(
      (item): item is (typeof normalizedItems)[number] & { variantId: bigint } =>
        typeof item.variantId === "bigint",
    );
    const productOnlyItems = normalizedItems.filter((item) => item.variantId === undefined);

    if (productOnlyItems.length > 0) {
      await createInventoryMovements(
        productOnlyItems.map((item) => ({
          branchId: input.branchId,
          productId: item.productId,
          movementType: StockMovementType.IN,
          quantity: toDecimal(item.quantity),
          unitCost: toDecimal(item.unitCost),
          referenceTable: "inventory.purchases",
          referenceId: purchase.id,
        })),
        tx,
      );
    }

    for (const item of variantItems) {
      await updateVariantAverageCostForInbound({
        tx,
        variantId: item.variantId,
        branchId: input.branchId,
        inQuantity: toDecimal(item.quantity),
        unitCost: toDecimal(item.unitCost),
      });
    }

    if (variantItems.length > 0) {
      await createVariantInventoryMovements(
        variantItems.map((item) => ({
          branchId: input.branchId,
          variantId: item.variantId,
          movementType: StockMovementType.IN,
          quantity: toDecimal(item.quantity),
          unitCost: toDecimal(item.unitCost),
          referenceTable: "inventory.purchases",
          referenceId: purchase.id,
        })),
        tx,
      );
    }

    return {
      purchaseId: purchase.id.toString(),
      supplierId: purchase.supplierId,
      branchId: purchase.branchId ?? null,
      currency: purchase.currency,
      totals: {
        subtotal: purchase.subtotal.toString(),
        taxTotal: purchase.taxTotal.toString(),
        total: purchase.total.toString(),
      },
      itemsCount: normalizedItems.length,
    };
  });
}

export async function registerInventoryAdjust(
  input: InventoryAdjustInputDto,
): Promise<InventoryAdjustOutputDto> {
  const product = await findProductsByIds([input.productId]);
  if (product.length === 0) {
    throw new AppError("NOT_FOUND", 404, "Product not found.");
  }

  const movementType = input.direction === "IN" ? StockMovementType.IN : StockMovementType.OUT;
  const movement = await createInventoryMovement({
    branchId: input.branchId,
    productId: input.productId,
    movementType,
    quantity: toDecimal(input.quantity),
    unitCost: toDecimal(input.unitCost ?? 0),
    referenceTable: buildAdjustReferenceTable(input.reason),
  });

  return {
    movementId: movement.id.toString(),
    movementType: input.direction,
    productId: movement.productId,
    quantity: movement.quantity.toString(),
    unitCost: movement.unitCost.toString(),
    branchId: movement.branchId ?? null,
  };
}

export async function getInventoryStock(params: {
  branchId?: number;
  search?: string;
  limit: number;
  offset: number;
}): Promise<InventoryStockOutputDto> {
  const rows = await queryInventoryStock(params);

  return {
    items: rows.map((row) => ({
      productId: row.product_id,
      sku: row.sku,
      name: row.name,
      branchId: row.branch_id,
      stockOnHand: row.stock_on_hand.toString(),
    })),
    pagination: {
      limit: params.limit,
      offset: params.offset,
      count: rows.length,
    },
  };
}

export async function getDailySalesReport(query: SalesDailyQueryDto): Promise<SalesDailyItemDto[]> {
  const rows = await querySalesDaily(query.from, query.to);

  return rows.map((row) => ({
    day: row.day.toISOString().slice(0, 10),
    salesCount: Number(row.sales_count),
    salesTotal: row.sales_total.toString(),
  }));
}

export async function getTopProductsReport(query: TopProductsQueryDto): Promise<TopProductItemDto[]> {
  const rows = await queryTopProducts(query.from, query.to, query.limit);

  return rows.map((row) => ({
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    quantity: row.quantity.toString(),
    total: row.total.toString(),
  }));
}

export async function getProfitDailyReport(query: ProfitDailyQueryDto): Promise<ProfitDailyItemDto[]> {
  const rows = await queryProfitDaily(query.from, query.to);
  return rows.map((row) => ({
    day: row.day.toISOString().slice(0, 10),
    totalSales: row.total_sales.toString(),
    totalCogs: row.total_cogs.toString(),
    grossProfit: row.gross_profit.toString(),
  }));
}

export async function getProfitTopVariantsReport(
  query: ProfitTopVariantsQueryDto,
): Promise<ProfitTopVariantItemDto[]> {
  const rows = await queryProfitTopVariants(query.from, query.to, query.limit);
  return rows.map((row) => ({
    variantId: row.variant_id.toString(),
    productId: row.product_id,
    productName: row.product_name,
    variantName: row.variant_name,
    variantSku: row.variant_sku,
    quantity: row.quantity.toString(),
    totalSales: row.total_sales.toString(),
    totalCogs: row.total_cogs.toString(),
    grossProfit: row.gross_profit.toString(),
  }));
}
