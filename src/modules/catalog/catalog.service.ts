import { Prisma } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { slugify } from "@/lib/text/slug";
import type {
  AdminProductCategoryOptionsOutputDto,
  AdminProductsBulkUpdateInputDto,
  AdminProductsBulkUpdateOutputDto,
  AdminProductsListOutputDto,
  AdminProductsListQueryDto,
  CatalogVariantDto,
  CatalogListOutputDto,
  CatalogListQueryDto,
  CatalogItemDto,
  CreateProductInputDto,
  GenerateSlugsOutputDto,
  ProductDetailDto,
  ProductRecommendationDto,
  StoreCategoriesOutputDto,
} from "@/modules/catalog/catalog.dto";
import {
  bulkSetProductsActive,
  bulkSetProductsCategory,
  countActiveProductsForCatalog,
  createProduct,
  findCategoryById,
  updateProductById,
  findActiveProductByIdForStore,
  findActiveProductsForCatalog,
  findActiveVariantsByProductId,
  findActiveVariantsByProductIds,
  findProductBySlugForStore,
  existsProductSlug,
  listActiveProductIdsForSitemap,
  listProductsWithoutSlug,
  listProductImagesForStore,
  updateProductSlug,
  findProductRecommendations,
  listProductsForAdmin,
  listProductCategoryOptions,
  countProductsForAdmin,
  listStoreCategoriesWithActiveProductCount,
  setProductFeatured,
  listFeaturedProductsForAdmin,
} from "@/modules/catalog/catalog.repo";
import { getActiveReservedVariantQtyMap, getVariantStockOnHandMap } from "@/modules/variants/variants.repo";

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
    countActiveProductsForCatalog(query),
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
      total,
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
    images: [],
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
  const imageRows = await listProductImagesForStore(row.id);
  const variantIds = variants.map((variant) => variant.id);
  const [stockMap, reservedMap] = await Promise.all([
    getVariantStockOnHandMap(variantIds, { branchId: options?.branchId }),
    getActiveReservedVariantQtyMap(variantIds, { branchId: options?.branchId }),
  ]);
  return {
    ...detail,
    images: imageRows.map((image) => ({
      id: image.id.toString(),
      url: image.url,
      alt: image.alt,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    })),
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

export async function listCatalogProductsForAdmin(
  query: AdminProductsListQueryDto,
): Promise<AdminProductsListOutputDto> {
  const [rows, count] = await Promise.all([
    listProductsForAdmin(query),
    countProductsForAdmin(query.search),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      slug: row.slug,
      isActive: row.is_active,
      isFeatured: row.is_featured,
      categoryId: row.category_id,
      categoryName: row.category_name ?? null,
      createdAt: row.created_at.toISOString(),
    })),
    pagination: {
      limit: query.limit,
      offset: query.offset,
      count,
    },
  };
}

export async function listCatalogProductCategoryOptionsForAdmin(): Promise<AdminProductCategoryOptionsOutputDto> {
  const rows = await listProductCategoryOptions();
  return {
    items: rows.map((row) => ({ id: row.id, name: row.name })),
  };
}

export async function bulkUpdateCatalogProductsForAdmin(
  input: AdminProductsBulkUpdateInputDto,
): Promise<AdminProductsBulkUpdateOutputDto> {
  if (input.action === "SET_ACTIVE") {
    return { updatedCount: await bulkSetProductsActive(input.productIds, input.isActive) };
  }

  if (input.categoryId !== null) {
    const category = await findCategoryById(input.categoryId);
    if (!category) {
      throw new AppError("BAD_REQUEST", 400, "Category not found.");
    }
  }

  return { updatedCount: await bulkSetProductsCategory(input.productIds, input.categoryId) };
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

export async function getStoreCategories(): Promise<StoreCategoriesOutputDto> {
  const rows = await listStoreCategoriesWithActiveProductCount(12);
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      activeProductsCount: Number(row.active_products_count),
    })),
  };
}

export async function updateCatalogProductForAdmin(
  productId: number,
  data: { name?: string; categoryId?: number | null },
) {
  if (data.name !== undefined && data.name.trim().length === 0) {
    throw new AppError("BAD_REQUEST", 400, "Name cannot be empty.");
  }
  if (data.categoryId !== undefined && data.categoryId !== null) {
    const category = await findCategoryById(data.categoryId);
    if (!category) throw new AppError("BAD_REQUEST", 400, "Category not found.");
  }
  return updateProductById(productId, data);
}

export async function setProductFeaturedStatus(productId: number, isFeatured: boolean) {
  return setProductFeatured(productId, isFeatured);
}

export async function listFeaturedProductsAdmin() {
  const rows = await listFeaturedProductsForAdmin();
  return rows.map((row) => ({ id: row.id, name: row.name, sku: row.sku, categoryId: row.category_id }));
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
