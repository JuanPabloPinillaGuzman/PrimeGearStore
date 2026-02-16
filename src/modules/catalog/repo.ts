import { prisma } from "@/lib/db/prisma";

export async function findActiveProductsForCatalog() {
  const today = new Date();

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      sku: true,
      name: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      productPrices: {
        where: {
          validFrom: { lte: today },
          OR: [{ validTo: null }, { validTo: { gte: today } }],
          priceList: {
            isDefault: true,
          },
        },
        orderBy: {
          validFrom: "desc",
        },
        take: 1,
        select: {
          salePrice: true,
          currency: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const productIds = products.map((product) => product.id);
  const images = productIds.length
    ? await prisma.productImage.findMany({
        where: {
          productId: {
            in: productIds,
          },
          isPrimary: true,
        },
        select: {
          productId: true,
          url: true,
          alt: true,
        },
      })
    : [];

  return { products, images };
}

export async function createProduct(data: {
  name: string;
  sku?: string;
  categoryId?: number;
}) {
  return prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku,
      categoryId: data.categoryId,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      categoryId: true,
      isActive: true,
    },
  });
}
