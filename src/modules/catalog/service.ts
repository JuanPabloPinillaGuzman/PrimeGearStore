import type { CatalogItemDto, CreateProductInputDto } from "@/modules/catalog/dto";
import { createProduct, findActiveProductsForCatalog } from "@/modules/catalog/repo";

export async function getCatalogItems(): Promise<CatalogItemDto[]> {
  const { products, images } = await findActiveProductsForCatalog();
  const imageMap = new Map(images.map((image) => [image.productId.toString(), image]));

  return products.map((product) => {
    const price = product.productPrices[0] ?? null;
    const image = imageMap.get(product.id.toString()) ?? null;

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
          }
        : null,
      price: price
        ? {
            amount: price.salePrice.toString(),
            currency: price.currency,
          }
        : null,
      image: image
        ? {
            url: image.url,
            alt: image.alt,
          }
        : null,
    };
  });
}

export async function createCatalogProduct(input: CreateProductInputDto) {
  return createProduct(input);
}
