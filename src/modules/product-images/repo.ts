import { prisma } from "@/lib/db/prisma";
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function clientOf(tx?: TxClient) {
  return tx ?? prisma;
}

export async function findProductById(productId: number) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true },
  });
}

export async function listProductImages(productId: number) {
  return prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
}

export async function listProductImagesTx(productId: number, tx: TxClient) {
  return tx.productImage.findMany({
    where: { productId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
}

export async function findProductImageById(productId: number, imageId: bigint) {
  return prisma.productImage.findFirst({
    where: {
      id: imageId,
      productId,
    },
  });
}

export async function getNextSortOrder(productId: number, tx?: TxClient) {
  const row = await clientOf(tx).productImage.findFirst({
    where: { productId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return (row?.sortOrder ?? -1) + 1;
}

export async function clearPrimaryImageForProduct(productId: number, tx?: TxClient) {
  return clientOf(tx).productImage.updateMany({
    where: { productId, isPrimary: true },
    data: { isPrimary: false },
  });
}

export async function createProductImage(
  data: { productId: number; url: string; alt?: string; isPrimary: boolean; sortOrder: number },
  tx?: TxClient,
) {
  return clientOf(tx).productImage.create({
    data: {
      productId: data.productId,
      url: data.url,
      alt: data.alt,
      isPrimary: data.isPrimary,
      sortOrder: data.sortOrder,
    },
  });
}

export async function updateProductImage(
  imageId: bigint,
  data: { alt?: string; isPrimary?: boolean; sortOrder?: number },
  tx?: TxClient,
) {
  return clientOf(tx).productImage.update({
    where: { id: imageId },
    data,
  });
}

export async function deleteProductImage(imageId: bigint, tx?: TxClient) {
  return clientOf(tx).productImage.delete({
    where: { id: imageId },
  });
}
