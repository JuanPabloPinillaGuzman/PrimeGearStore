import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import type {
  CreateProductImageInputDto,
  ProductImageListOutputDto,
  UpdateProductImageInputDto,
} from "@/modules/product-images/dto";
import {
  clearPrimaryImageForProduct,
  createProductImage,
  deleteProductImage,
  findProductById,
  findProductImageById,
  getNextSortOrder,
  listProductImages,
  listProductImagesTx,
  updateProductImage,
} from "@/modules/product-images/repo";

function toItemDto(row: Awaited<ReturnType<typeof listProductImages>>[number]) {
  return {
    id: row.id.toString(),
    productId: row.productId,
    url: row.url,
    alt: row.alt,
    sortOrder: row.sortOrder,
    isPrimary: row.isPrimary,
    createdAt: row.createdAt.toISOString(),
  };
}

async function assertProductExists(productId: number) {
  const product = await findProductById(productId);
  if (!product) {
    throw new AppError("NOT_FOUND", 404, "Product not found.");
  }
  return product;
}

export async function listAdminProductImages(productId: number): Promise<ProductImageListOutputDto> {
  await assertProductExists(productId);
  const rows = await listProductImages(productId);
  return {
    productId,
    items: rows.map(toItemDto),
  };
}

export async function createAdminProductImage(productId: number, input: CreateProductImageInputDto) {
  await assertProductExists(productId);

  const row = await prisma.$transaction(async (tx) => {
    const hasImages = (await listProductImagesTx(productId, tx)).length > 0;
    const makePrimary = input.isPrimary === true || !hasImages;
    if (makePrimary) {
      await clearPrimaryImageForProduct(productId, tx);
    }
    const sortOrder = await getNextSortOrder(productId, tx);
    return createProductImage(
      {
        productId,
        url: input.url,
        alt: input.alt,
        isPrimary: makePrimary,
        sortOrder,
      },
      tx,
    );
  });

  return toItemDto(row);
}

export async function updateAdminProductImage(
  productId: number,
  imageId: number,
  input: UpdateProductImageInputDto,
) {
  const image = await findProductImageById(productId, BigInt(imageId));
  if (!image) {
    throw new AppError("NOT_FOUND", 404, "Product image not found.");
  }

  const row = await prisma.$transaction(async (tx) => {
    if (input.isPrimary === true) {
      await clearPrimaryImageForProduct(productId, tx);
    }
    return updateProductImage(
      BigInt(imageId),
      {
        alt: input.alt,
        isPrimary: input.isPrimary,
        sortOrder: input.sortOrder,
      },
      tx,
    );
  });

  return toItemDto(row);
}

export async function deleteAdminProductImage(productId: number, imageId: number) {
  const image = await findProductImageById(productId, BigInt(imageId));
  if (!image) {
    throw new AppError("NOT_FOUND", 404, "Product image not found.");
  }

  await deleteProductImage(BigInt(imageId));

  return { deleted: true };
}
