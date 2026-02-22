import { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { slugify } from "@/lib/text/slug";
import type {
  CatalogVariantDto,
  CatalogListOutputDto,
  CatalogListQueryDto,
  CatalogItemDto,
  CreateProductInputDto,
  GenerateSlugsOutputDto,
  ProductDetailDto,
  ProductRecommendationDto,
} from "@/modules/catalog/dto";
import {
  countActiveProductsForCatalog,
  createProduct,
  findActiveProductByIdForStore,
  findActiveProductsForCatalog,
  findActiveVariantsByProductId,
  findActiveVariantsByProductIds,
  findProductBySlugForStore,
  existsProductSlug,
  listActiveProductIdsForSitemap,
  listProductsWithoutSlug,
  updateProductSlug,
  findProductRecommendations,
} from "@/modules/catalog/repo";
import { getActiveReservedVariantQtyMap, getVariantStockOnHandMap } from "@/modules/variants/repo";

function mapCatalogRowToItem(row: Awaited<ReturnType<typeof findActiveProductsForCatalog>>[number]): CatalogItemDto {
  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    category:
      row.category_id && row.category_name
        ? {
            id: row.category_id,
            name: row.category_name,
          }
        : null,
    price:
      row.price_amount && row.price_currency
        ? {
            amount: row.price_amount.toString(),
            currency: row.price_currency,
          }
        : null,
    image:
      row.image_url
        ? {
            url: row.image_url,
            alt: row.image_alt,
          }
        : null,
  };
}

function mapVariantRowToDto(
  row: Awaited<ReturnType<typeof findActiveVariantsByProductIds>>[number],
): CatalogVariantDto {
  return {
    id: row.id.toString(),
    sku: row.sku,
    name: row.name,
    attributes:
      row.attributes && typeof row.attributes === "object" && !Array.isArray(row.attributes)
        ? (row.attributes as Record<string, unknown>)
        : {},
    isActive: row.is_active,
    price:
      row.price_amount && row.price_currency
        ? {
            amount: row.price_amount.toString(),
            currency: row.price_currency,
          }
        : null,
  };
}

export async function getCatalogItems(query: CatalogListQueryDto): Promise<CatalogListOutputDto> {
  const [rows, total] = await Promise.all([
    findActiveProductsForCatalog(query),
    countActiveProductsForCatalog(query.search),
  ]);

  const variantsByProduct = new Map<number, CatalogVariantDto[]>();
  if (query.expandVariants) {
    const variantRows = await findActiveVariantsByProductIds(rows.map((row) => row.id));
    const variantIds = variantRows.map((variant) => variant.id);
    const [stockMap, reservedMap] = await Promise.all([
      getVariantStockOnHandMap(variantIds),
      getActiveReservedVariantQtyMap(variantIds),
    ]);
    for (const variant of variantRows) {
      const current = variantsByProduct.get(variant.product_id) ?? [];
      const mapped = mapVariantRowToDto(variant);
      const stock = stockMap.get(variant.id.toString()) ?? new Prisma.Decimal(0);
      const reserved = reservedMap.get(variant.id.toString()) ?? new Prisma.Decimal(0);
      const available = stock.minus(reserved);
      current.push({
        ...mapped,
        stockOnHand: stock.toString(),
        availableToSell: available.toString(),
        isInStock: available.greaterThan(0),
      });
      variantsByProduct.set(variant.product_id, current);
    }
  }

  return {
    items: rows.map((row) => ({
      ...mapCatalogRowToItem(row),
      ...(query.expandVariants ? { variants: variantsByProduct.get(row.id) ?? [] } : {}),
    })),
    pagination: {
      limit: query.limit,
      offset: query.offset,
      count: total,
    },
  };
}

function mapRowToProductDetail(
  row: NonNullable<Awaited<ReturnType<typeof findActiveProductByIdForStore>>>,
): ProductDetailDto {
  return {
    ...mapCatalogRowToItem(row),
    slug: row.slug,
    isActive: row.is_active,
    variants: [],
  };
}

export async function getCatalogProductDetail(productId: number): Promise<ProductDetailDto> {
  const row = await findActiveProductByIdForStore(productId);
  if (!row) {
    throw new AppError("NOT_FOUND", 404, "Product not found.");
  }

  return mapRowToProductDetail(row);
}

export async function getCatalogProductDetailBySlug(slug: string): Promise<ProductDetailDto> {
  return getCatalogProductDetailBySlugWithStock(slug);
}

export async function getCatalogProductDetailBySlugWithStock(
  slug: string,
  options?: { branchId?: number },
): Promise<ProductDetailDto> {
  const row = await findProductBySlugForStore(slug);
  if (!row) {
    throw new AppError("NOT_FOUND", 404, "Product not found.");
  }

  const detail = mapRowToProductDetail(row);
  const variants = await findActiveVariantsByProductId(row.id);
  const variantIds = variants.map((variant) => variant.id);
  const [stockMap, reservedMap] = await Promise.all([
    getVariantStockOnHandMap(variantIds, { branchId: options?.branchId }),
    getActiveReservedVariantQtyMap(variantIds, { branchId: options?.branchId }),
  ]);
  return {
    ...detail,
    variants: variants.map((variant) => {
      const mapped = mapVariantRowToDto(variant);
      const stock = stockMap.get(variant.id.toString()) ?? new Prisma.Decimal(0);
      const reserved = reservedMap.get(variant.id.toString()) ?? new Prisma.Decimal(0);
      const available = stock.minus(reserved);
      return {
        ...mapped,
        stockOnHand: stock.toString(),
        availableToSell: available.toString(),
        isInStock: available.greaterThan(0),
      };
    }),
  };
}

export async function getCatalogSitemapProducts() {
  return listActiveProductIdsForSitemap();
}

export async function createCatalogProduct(input: CreateProductInputDto) {
  return createProduct(input);
}

export async function getStoreRecommendations(productId: number): Promise<ProductRecommendationDto[]> {
  const rows = await findProductRecommendations(productId, 8);
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    price:
      row.price_amount && row.price_currency
        ? {
            amount: row.price_amount.toString(),
            currency: row.price_currency,
          }
        : null,
    image: row.image_url
      ? {
          url: row.image_url,
          alt: row.image_alt,
        }
      : null,
  }));
}

export async function generateProductSlugs(limit = 500): Promise<GenerateSlugsOutputDto> {
  const products = await listProductsWithoutSlug(limit);
  let generated = 0;

  for (const product of products) {
    const base = slugify(product.name);
    let candidate = base;
    let suffix = 2;
    while (await existsProductSlug(candidate, product.id)) {
      const next = `${base}-${suffix}`;
      candidate = next.slice(0, 220);
      suffix += 1;
    }

    await updateProductSlug(product.id, candidate);
    generated += 1;
  }

  return {
    processed: products.length,
    generated,
  };
}
