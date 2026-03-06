import { Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";
import {
  getLastInboundVariantUnitCost,
  getVariantAvgCostWithFallback,
  getVariantStockOnHand,
  upsertVariantAvgCost,
} from "@/modules/costing/costing.repo";

function roundCurrency(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export async function updateVariantAverageCostForInbound(params: {
  tx: Prisma.TransactionClient;
  variantId: bigint;
  branchId?: number;
  inQuantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
}) {
  const oldQty = await getVariantStockOnHand(params.variantId, params.branchId, params.tx);
  const currentAvgRow = await getVariantAvgCostWithFallback(params.variantId, params.branchId, params.tx);
  const oldAvg = currentAvgRow?.avgCost ?? new Prisma.Decimal(0);
  const denom = oldQty.plus(params.inQuantity);

  if (denom.lte(0)) {
    return upsertVariantAvgCost(
      {
        variantId: params.variantId,
        branchId: params.branchId,
        avgCost: new Prisma.Decimal(0),
      },
      params.tx,
    );
  }

  const newAvg = roundCurrency(
    oldQty.times(oldAvg).plus(params.inQuantity.times(params.unitCost)).div(denom),
  );

  return upsertVariantAvgCost(
    {
      variantId: params.variantId,
      branchId: params.branchId,
      avgCost: newAvg,
    },
    params.tx,
  );
}

export async function resolveVariantUnitCostForSale(params: {
  tx: Prisma.TransactionClient;
  variantId: bigint;
  branchId?: number;
}) {
  const avgRow = await getVariantAvgCostWithFallback(params.variantId, params.branchId, params.tx);
  if (avgRow && avgRow.avgCost.gte(0)) {
    return avgRow.avgCost;
  }

  const fallback = await getLastInboundVariantUnitCost(params.variantId, params.branchId, params.tx);
  if (fallback) {
    logger.warn(
      {
        variantId: params.variantId.toString(),
        branchId: params.branchId ?? null,
      },
      "WAC missing for variant, using last inbound unit cost fallback",
    );
    return fallback;
  }

  logger.warn(
    {
      variantId: params.variantId.toString(),
      branchId: params.branchId ?? null,
    },
    "No cost history found for variant, defaulting unit_cost=0",
  );
  return new Prisma.Decimal(0);
}
