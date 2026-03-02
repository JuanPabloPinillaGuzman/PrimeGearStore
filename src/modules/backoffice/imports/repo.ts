import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type Tx = Prisma.TransactionClient;

export async function findProductForImportByIdOrSku(
  tx: Tx,
  params: { productId?: number; sku?: string },
) {
  if (params.productId) {
    return tx.product.findUnique({ where: { id: params.productId } });
  }
  if (params.sku) {
    return tx.product.findFirst({ where: { sku: params.sku } });
  }
  return null;
}

export async function upsertProductImport(
  tx: Tx,
  input: {
    existingId?: number;
    sku?: string;
    name: string;
    categoryId?: number | null;
    isActive?: boolean;
    slug?: string;
  },
) {
  if (input.existingId) {
    return tx.product.update({
      where: { id: input.existingId },
      data: {
        sku: input.sku,
        name: input.name,
        categoryId: input.categoryId,
        isActive: input.isActive,
        slug: input.slug,
      },
      select: { id: true },
    });
  }

  return tx.product.create({
    data: {
      sku: input.sku,
      name: input.name,
      categoryId: input.categoryId,
      isActive: input.isActive ?? true,
      slug: input.slug,
    },
    select: { id: true },
  });
}

export async function findCategoryForImport(tx: Tx, categoryId: number) {
  return tx.category.findUnique({ where: { id: categoryId }, select: { id: true } });
}

export async function findVariantForImportByIdOrSku(
  tx: Tx,
  params: { variantId?: bigint; sku?: string },
) {
  if (params.variantId) {
    return tx.productVariant.findUnique({ where: { id: params.variantId } });
  }
  if (params.sku) {
    return tx.productVariant.findFirst({ where: { sku: params.sku } });
  }
  return null;
}

export async function findProductForVariantImport(tx: Tx, productId: number) {
  return tx.product.findUnique({ where: { id: productId }, select: { id: true } });
}

export async function upsertVariantImport(
  tx: Tx,
  input: {
    existingId?: bigint;
    productId: number;
    sku?: string;
    name: string;
    attributes: Prisma.InputJsonValue;
    isActive?: boolean;
  },
) {
  if (input.existingId) {
    return tx.productVariant.update({
      where: { id: input.existingId },
      data: {
        productId: input.productId,
        sku: input.sku,
        name: input.name,
        attributes: input.attributes,
        isActive: input.isActive,
      },
      select: { id: true },
    });
  }

  return tx.productVariant.create({
    data: {
      productId: input.productId,
      sku: input.sku,
      name: input.name,
      attributes: input.attributes,
      isActive: input.isActive ?? true,
    },
    select: { id: true },
  });
}

export { prisma };

