import { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import type {
  CreateVariantInputDto,
  CreateVariantPriceInputDto,
  UpdateVariantInputDto,
} from "@/modules/variants/variants.dto";
import {
  createVariant,
  createVariantPrice,
  deleteVariant,
  findVariantById,
  findProductForVariant,
  findVariantByIdForProduct,
  listVariantPrices,
  listVariantsByProduct,
  queryVariantStock,
  updateVariant,
} from "@/modules/variants/variants.repo";

function parseVariantId(value: string) {
  try {
    return BigInt(value);
  } catch {
    throw new AppError("BAD_REQUEST", 400, "Invalid variantId.");
  }
}

function mapVariant(variant: Awaited<ReturnType<typeof listVariantsByProduct>>[number]) {
  return {
    id: variant.id.toString(),
    productId: variant.productId,
    sku: variant.sku,
    name: variant.name,
    attributes:
      variant.attributes && typeof variant.attributes === "object" && !Array.isArray(variant.attributes)
        ? (variant.attributes as Record<string, unknown>)
        : {},
    isActive: variant.isActive,
  };
}

export async function listProductVariants(productId: number) {
  const product = await findProductForVariant(productId);
  if (!product) throw new AppError("NOT_FOUND", 404, "Product not found.");

  const variants = await listVariantsByProduct(productId);
  return { items: variants.map(mapVariant) };
}

export async function createProductVariant(input: CreateVariantInputDto) {
  const product = await findProductForVariant(input.productId);
  if (!product) throw new AppError("NOT_FOUND", 404, "Product not found.");

  const variant = await createVariant({
    productId: input.productId,
    sku: input.sku,
    name: input.name,
    attributes: input.attributes as Prisma.InputJsonValue,
    isActive: input.isActive,
  });

  return mapVariant(variant);
}

export async function updateProductVariant(input: UpdateVariantInputDto) {
  const variantId = parseVariantId(input.variantId);
  const existing = await findVariantByIdForProduct(input.productId, variantId);
  if (!existing) throw new AppError("NOT_FOUND", 404, "Variant not found.");

  const updated = await updateVariant(variantId, {
    sku: input.sku,
    name: input.name,
    attributes: input.attributes as Prisma.InputJsonValue | undefined,
    isActive: input.isActive,
  });

  return mapVariant(updated);
}

export async function deleteProductVariant(productId: number, variantIdValue: string) {
  const variantId = parseVariantId(variantIdValue);
  const existing = await findVariantByIdForProduct(productId, variantId);
  if (!existing) throw new AppError("NOT_FOUND", 404, "Variant not found.");

  await deleteVariant(variantId);
  return { id: variantId.toString(), deleted: true };
}

export async function listProductVariantPrices(productId: number, variantIdValue: string) {
  const variantId = parseVariantId(variantIdValue);
  const existing = await findVariantByIdForProduct(productId, variantId);
  if (!existing) throw new AppError("NOT_FOUND", 404, "Variant not found.");

  const prices = await listVariantPrices(variantId);
  return {
    items: prices.map((price) => ({
      id: price.id.toString(),
      variantId: price.variantId.toString(),
      priceListId: price.priceListId,
      priceListName: price.priceList.name,
      isDefaultPriceList: price.priceList.isDefault,
      salePrice: price.salePrice.toString(),
      currency: price.currency,
      validFrom: price.validFrom.toISOString().slice(0, 10),
      validTo: price.validTo?.toISOString().slice(0, 10) ?? null,
    })),
  };
}

export async function createProductVariantPrice(input: CreateVariantPriceInputDto) {
  const variantId = parseVariantId(input.variantId);
  const existing = await findVariantByIdForProduct(input.productId, variantId);
  if (!existing) throw new AppError("NOT_FOUND", 404, "Variant not found.");

  const created = await createVariantPrice({
    variantId,
    priceListId: input.priceListId,
    salePrice: new Prisma.Decimal(input.salePrice),
    currency: input.currency ?? "COP",
    validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
    validTo:
      typeof input.validTo === "string"
        ? new Date(input.validTo)
        : input.validTo === null
          ? null
          : undefined,
  });

  return {
    id: created.id.toString(),
    variantId: created.variantId.toString(),
    priceListId: created.priceListId,
    salePrice: created.salePrice.toString(),
    currency: created.currency,
    validFrom: created.validFrom.toISOString().slice(0, 10),
    validTo: created.validTo?.toISOString().slice(0, 10) ?? null,
  };
}

export async function updateVariantById(input: {
  variantId: string;
  sku?: string;
  name?: string;
  attributes?: Record<string, unknown>;
  isActive?: boolean;
}) {
  const variantId = parseVariantId(input.variantId);
  const existing = await findVariantById(variantId);
  if (!existing) throw new AppError("NOT_FOUND", 404, "Variant not found.");

  const updated = await updateVariant(variantId, {
    sku: input.sku,
    name: input.name,
    attributes: input.attributes as Prisma.InputJsonValue | undefined,
    isActive: input.isActive,
  });
  return mapVariant(updated);
}

export async function createVariantPriceByVariantId(input: {
  variantId: string;
  priceListId: number;
  salePrice: number;
  currency?: "COP";
  validFrom?: string;
  validTo?: string | null;
}) {
  const variantId = parseVariantId(input.variantId);
  const variant = await findVariantById(variantId);
  if (!variant) throw new AppError("NOT_FOUND", 404, "Variant not found.");

  return createProductVariantPrice({
    productId: variant.productId,
    variantId: input.variantId,
    priceListId: input.priceListId,
    salePrice: input.salePrice,
    currency: input.currency,
    validFrom: input.validFrom,
    validTo: input.validTo,
  });
}

export async function getVariantStock(params: {
  branchId?: number;
  search?: string;
  limit: number;
  offset: number;
}) {
  const rows = await queryVariantStock(params);
  return {
    items: rows.map((row) => ({
      variantId: row.variant_id.toString(),
      productId: row.product_id,
      productName: row.product_name,
      productSku: row.product_sku,
      variantName: row.variant_name,
      variantSku: row.variant_sku,
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
