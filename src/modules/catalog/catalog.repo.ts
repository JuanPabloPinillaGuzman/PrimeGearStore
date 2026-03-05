import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function findActiveProductsForCatalog(params: {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: "RELEVANCE" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST" | "TOP_SELLERS";
  limit: number;
  offset: number;
}) {
  const like = params.search ? `%${params.search}%` : null;
  const whereSql = buildCatalogWhereSql(params, like);
  const today = new Date().toISOString().slice(0, 10);
  const orderBySql = buildCatalogOrderSql(params.sort, params.search);

  return prisma.$queryRaw<
    Array<{
      id: number;
      sku: string | null;
      slug: string | null;
      name: string;
      category_id: number | null;
      category_name: string | null;
      price_amount: Prisma.Decimal | null;
      price_currency: string | null;
      image_url: string | null;
      image_alt: string | null;
      is_active: boolean;
    }>
  >(Prisma.sql`
    WITH top_sellers_30 AS (
      SELECT
        si.product_id,
        COALESCE(SUM(si.quantity), 0)::numeric AS qty_30d
      FROM inventory.sale_items si
      INNER JOIN inventory.sales s ON s.id = si.sale_id
      WHERE s.sale_date >= (now() - interval '30 days')
        AND s.status IN ('ISSUED', 'PAID')
      GROUP BY si.product_id
    ),
    product_stock AS (
      SELECT
        x.product_id,
        SUM(x.available_qty)::numeric AS available_qty
      FROM (
        SELECT
          im.product_id,
          COALESCE(SUM(
            CASE
              WHEN im.movement_type IN ('IN', 'RETURN_IN') THEN im.quantity
              WHEN im.movement_type IN ('OUT', 'RETURN_OUT') THEN -im.quantity
              ELSE 0
            END
          ), 0)::numeric
          - COALESCE((
            SELECT SUM(sr.quantity)
            FROM webstore.stock_reservations sr
            WHERE sr.product_id = im.product_id
              AND sr.variant_id IS NULL
              AND sr.status = 'ACTIVE'
              AND sr.expires_at > now()
          ), 0)::numeric AS available_qty
        FROM inventory.inventory_movements im
        GROUP BY im.product_id

        UNION ALL

        SELECT
          pv.product_id,
          COALESCE(SUM(
            CASE
              WHEN vim.movement_type IN ('IN', 'RETURN_IN') THEN vim.quantity
              WHEN vim.movement_type IN ('OUT', 'RETURN_OUT') THEN -vim.quantity
              ELSE 0
            END
          ), 0)::numeric
          - COALESCE((
            SELECT SUM(sr.quantity)
            FROM webstore.stock_reservations sr
            WHERE sr.variant_id = pv.id
              AND sr.status = 'ACTIVE'
              AND sr.expires_at > now()
          ), 0)::numeric AS available_qty
        FROM inventory.product_variants pv
        LEFT JOIN inventory.variant_inventory_movements vim ON vim.variant_id = pv.id
        GROUP BY pv.product_id, pv.id
      ) x
      GROUP BY x.product_id
    )
    SELECT
      p.id,
      p.sku,
      p.slug,
      p.name,
      p.category_id,
      c.name AS category_name,
      vp.sale_price AS price_amount,
      vp.currency AS price_currency,
      pi.url AS image_url,
      pi.alt AS image_alt,
      p.is_active
    FROM inventory.products p
    LEFT JOIN inventory.categories c
      ON c.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT pp.sale_price, pp.currency
      FROM inventory.product_prices pp
      INNER JOIN inventory.price_lists pl ON pl.id = pp.price_list_id
      WHERE pp.product_id = p.id
        AND pl.is_default = true
        AND pp.valid_from <= ${today}::date
        AND (pp.valid_to IS NULL OR pp.valid_to >= ${today}::date)
      ORDER BY pp.valid_from DESC
      LIMIT 1
    ) vp ON TRUE
    LEFT JOIN LATERAL (
      SELECT wpi.url, wpi.alt
      FROM webstore.product_images wpi
      WHERE wpi.product_id = p.id
        AND wpi.is_primary = true
      ORDER BY wpi.created_at DESC, wpi.id DESC
      LIMIT 1
    ) pi ON TRUE
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    LEFT JOIN top_sellers_30 ts ON ts.product_id = p.id
    ${whereSql}
    ${orderBySql}
    LIMIT ${params.limit}
    OFFSET ${params.offset}
  `);
}

export async function countActiveProductsForCatalog(params: {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const like = params.search ? `%${params.search}%` : null;
  const whereSql = buildCatalogWhereSql(params, like);

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    WITH product_stock AS (
      SELECT
        x.product_id,
        SUM(x.available_qty)::numeric AS available_qty
      FROM (
        SELECT
          im.product_id,
          COALESCE(SUM(
            CASE
              WHEN im.movement_type IN ('IN', 'RETURN_IN') THEN im.quantity
              WHEN im.movement_type IN ('OUT', 'RETURN_OUT') THEN -im.quantity
              ELSE 0
            END
          ), 0)::numeric
          - COALESCE((
            SELECT SUM(sr.quantity)
            FROM webstore.stock_reservations sr
            WHERE sr.product_id = im.product_id
              AND sr.variant_id IS NULL
              AND sr.status = 'ACTIVE'
              AND sr.expires_at > now()
          ), 0)::numeric AS available_qty
        FROM inventory.inventory_movements im
        GROUP BY im.product_id

        UNION ALL

        SELECT
          pv.product_id,
          COALESCE(SUM(
            CASE
              WHEN vim.movement_type IN ('IN', 'RETURN_IN') THEN vim.quantity
              WHEN vim.movement_type IN ('OUT', 'RETURN_OUT') THEN -vim.quantity
              ELSE 0
            END
          ), 0)::numeric
          - COALESCE((
            SELECT SUM(sr.quantity)
            FROM webstore.stock_reservations sr
            WHERE sr.variant_id = pv.id
              AND sr.status = 'ACTIVE'
              AND sr.expires_at > now()
          ), 0)::numeric AS available_qty
        FROM inventory.product_variants pv
        LEFT JOIN inventory.variant_inventory_movements vim ON vim.variant_id = pv.id
        GROUP BY pv.product_id, pv.id
      ) x
      GROUP BY x.product_id
    )
    SELECT COUNT(*)::bigint AS count
    FROM inventory.products p
    LEFT JOIN LATERAL (
      SELECT pp.sale_price, pp.currency
      FROM inventory.product_prices pp
      INNER JOIN inventory.price_lists pl ON pl.id = pp.price_list_id
      WHERE pp.product_id = p.id
        AND pl.is_default = true
        AND pp.valid_from <= ${today}::date
        AND (pp.valid_to IS NULL OR pp.valid_to >= ${today}::date)
      ORDER BY pp.valid_from DESC
      LIMIT 1
    ) vp ON TRUE
    LEFT JOIN product_stock ps ON ps.product_id = p.id
    ${whereSql}
  `);

  return Number(rows[0]?.count ?? 0);
}

function buildCatalogWhereSql(
  params: {
    search?: string;
    categoryId?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    featured?: boolean;
  },
  like: string | null,
) {
  const conditions: Prisma.Sql[] = [Prisma.sql`p.is_active = true`];

  if (like) {
    conditions.push(Prisma.sql`(p.name ILIKE ${like} OR p.sku ILIKE ${like})`);
  }
  if (params.categoryId) {
    conditions.push(Prisma.sql`p.category_id = ${params.categoryId}`);
  }
  if (typeof params.minPrice === "number") {
    conditions.push(Prisma.sql`vp.sale_price IS NOT NULL AND vp.sale_price >= ${params.minPrice}`);
  }
  if (typeof params.maxPrice === "number") {
    conditions.push(Prisma.sql`vp.sale_price IS NOT NULL AND vp.sale_price <= ${params.maxPrice}`);
  }
  if (params.inStock === true) {
    conditions.push(Prisma.sql`COALESCE(ps.available_qty, 0) > 0`);
  }
  if (params.featured) {
    conditions.push(Prisma.sql`p.is_featured = true`);
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export async function setProductFeatured(productId: number, isFeatured: boolean) {
  await prisma.$executeRaw`
    UPDATE inventory.products
    SET is_featured = ${isFeatured}
    WHERE id = ${productId}
  `;
  return { id: productId, isFeatured };
}

export async function listFeaturedProductsForAdmin() {
  return prisma.$queryRaw<
    Array<{ id: number; name: string; sku: string | null; category_id: number | null }>
  >(Prisma.sql`
    SELECT id, name, sku, category_id
    FROM inventory.products
    WHERE is_featured = true AND is_active = true
    ORDER BY created_at DESC
  `);
}

function buildCatalogOrderSql(
  sort: "RELEVANCE" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST" | "TOP_SELLERS" | undefined,
  search?: string,
) {
  const like = search ? `%${search}%` : null;
  switch (sort) {
    case "PRICE_ASC":
      return Prisma.sql`ORDER BY vp.sale_price ASC NULLS LAST, p.created_at DESC`;
    case "PRICE_DESC":
      return Prisma.sql`ORDER BY vp.sale_price DESC NULLS LAST, p.created_at DESC`;
    case "TOP_SELLERS":
      return Prisma.sql`ORDER BY COALESCE(ts.qty_30d, 0) DESC, p.created_at DESC`;
    case "NEWEST":
      return Prisma.sql`ORDER BY p.created_at DESC`;
    case "RELEVANCE":
    default:
      if (search && like) {
        return Prisma.sql`
          ORDER BY
            CASE WHEN p.name ILIKE ${like} THEN 0 ELSE 1 END ASC,
            POSITION(lower(${search}) IN lower(COALESCE(p.name, ''))) ASC,
            p.created_at DESC
        `;
      }
      return Prisma.sql`ORDER BY p.created_at DESC`;
  }
}

export async function findActiveProductByIdForStore(productId: number) {
  const today = new Date().toISOString().slice(0, 10);
  const detailRows = await prisma.$queryRaw<
    Array<{
      id: number;
      sku: string | null;
      slug: string | null;
      name: string;
      category_id: number | null;
      category_name: string | null;
      price_amount: Prisma.Decimal | null;
      price_currency: string | null;
      image_url: string | null;
      image_alt: string | null;
      is_active: boolean;
    }>
  >(Prisma.sql`
    SELECT
      p.id,
      p.sku,
      p.slug,
      p.name,
      p.category_id,
      c.name AS category_name,
      vp.sale_price AS price_amount,
      vp.currency AS price_currency,
      pi.url AS image_url,
      pi.alt AS image_alt,
      p.is_active
    FROM inventory.products p
    LEFT JOIN inventory.categories c ON c.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT pp.sale_price, pp.currency
      FROM inventory.product_prices pp
      INNER JOIN inventory.price_lists pl ON pl.id = pp.price_list_id
      WHERE pp.product_id = p.id
        AND pl.is_default = true
        AND pp.valid_from <= ${today}::date
        AND (pp.valid_to IS NULL OR pp.valid_to >= ${today}::date)
      ORDER BY pp.valid_from DESC
      LIMIT 1
    ) vp ON TRUE
    LEFT JOIN LATERAL (
      SELECT wpi.url, wpi.alt
      FROM webstore.product_images wpi
      WHERE wpi.product_id = p.id
        AND wpi.is_primary = true
      ORDER BY wpi.created_at DESC, wpi.id DESC
      LIMIT 1
    ) pi ON TRUE
    WHERE p.id = ${productId}
      AND p.is_active = true
    LIMIT 1
  `);

  return detailRows[0] ?? null;
}

export async function listActiveProductIdsForSitemap() {
  return prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function findProductBySlugForStore(slug: string) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw<
    Array<{
      id: number;
      sku: string | null;
      slug: string | null;
      name: string;
      category_id: number | null;
      category_name: string | null;
      price_amount: Prisma.Decimal | null;
      price_currency: string | null;
      image_url: string | null;
      image_alt: string | null;
      is_active: boolean;
    }>
  >(Prisma.sql`
    SELECT
      p.id,
      p.sku,
      p.slug,
      p.name,
      p.category_id,
      c.name AS category_name,
      vp.sale_price AS price_amount,
      vp.currency AS price_currency,
      pi.url AS image_url,
      pi.alt AS image_alt,
      p.is_active
    FROM inventory.products p
    LEFT JOIN inventory.categories c ON c.id = p.category_id
    LEFT JOIN LATERAL (
      SELECT pp.sale_price, pp.currency
      FROM inventory.product_prices pp
      INNER JOIN inventory.price_lists pl ON pl.id = pp.price_list_id
      WHERE pp.product_id = p.id
        AND pl.is_default = true
        AND pp.valid_from <= ${today}::date
        AND (pp.valid_to IS NULL OR pp.valid_to >= ${today}::date)
      ORDER BY pp.valid_from DESC
      LIMIT 1
    ) vp ON TRUE
    LEFT JOIN LATERAL (
      SELECT wpi.url, wpi.alt
      FROM webstore.product_images wpi
      WHERE wpi.product_id = p.id
        AND wpi.is_primary = true
      ORDER BY wpi.created_at DESC, wpi.id DESC
      LIMIT 1
    ) pi ON TRUE
    WHERE p.slug = ${slug}
      AND p.is_active = true
    LIMIT 1
  `);

  return rows[0] ?? null;
}

export async function listProductImagesForStore(productId: number) {
  return prisma.productImage.findMany({
    where: { productId },
    select: {
      id: true,
      url: true,
      alt: true,
      sortOrder: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
}

export async function findActiveVariantsByProductIds(productIds: number[]) {
  if (productIds.length === 0) {
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);
  return prisma.$queryRaw<
    Array<{
      id: bigint;
      product_id: number;
      sku: string | null;
      name: string;
      attributes: Prisma.JsonValue;
      is_active: boolean;
      price_amount: Prisma.Decimal | null;
      price_currency: string | null;
    }>
  >(Prisma.sql`
    SELECT
      v.id,
      v.product_id,
      v.sku,
      v.name,
      v.attributes,
      v.is_active,
      vp.sale_price AS price_amount,
      vp.currency AS price_currency
    FROM inventory.product_variants v
    LEFT JOIN LATERAL (
      SELECT x.sale_price, x.currency
      FROM inventory.variant_prices x
      INNER JOIN inventory.price_lists pl ON pl.id = x.price_list_id
      WHERE x.variant_id = v.id
        AND pl.is_default = true
        AND x.valid_from <= ${today}::date
        AND (x.valid_to IS NULL OR x.valid_to >= ${today}::date)
      ORDER BY x.valid_from DESC
      LIMIT 1
    ) vp ON TRUE
    WHERE v.product_id IN (${Prisma.join(productIds)})
      AND v.is_active = true
    ORDER BY v.id ASC
  `);
}

export async function findActiveVariantsByProductId(productId: number) {
  return findActiveVariantsByProductIds([productId]);
}

export async function findProductSlugById(productId: number) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      isActive: true,
    },
  });
}

export async function listProductsWithoutSlug(limit = 500) {
  return prisma.product.findMany({
    where: {
      slug: null,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      id: "asc",
    },
    take: limit,
  });
}

export async function existsProductSlug(slug: string, excludeProductId?: number) {
  const row = await prisma.product.findFirst({
    where: {
      slug,
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    select: { id: true },
  });
  return !!row;
}

export async function updateProductSlug(productId: number, slug: string) {
  return prisma.product.update({
    where: { id: productId },
    data: { slug },
    select: {
      id: true,
      slug: true,
    },
  });
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

export async function listProductCategoryOptions() {
  return prisma.category.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function bulkSetProductsActive(productIds: number[], isActive: boolean) {
  const result = await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: { isActive },
  });
  return result.count;
}

export async function bulkSetProductsCategory(productIds: number[], categoryId: number | null) {
  const result = await prisma.product.updateMany({
    where: { id: { in: productIds } },
    data: { categoryId },
  });
  return result.count;
}

export async function findCategoryById(categoryId: number) {
  return prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
}

export async function listProductsForAdmin(params: {
  search?: string;
  limit: number;
  offset: number;
}) {
  const like = params.search ? `%${params.search}%` : null;
  const whereSql = like
    ? Prisma.sql`WHERE (p.name ILIKE ${like} OR p.sku ILIKE ${like} OR p.slug ILIKE ${like})`
    : Prisma.sql``;

  return prisma.$queryRaw<
    Array<{
      id: number;
      name: string;
      sku: string | null;
      slug: string | null;
      is_active: boolean;
      is_featured: boolean;
      category_id: number | null;
      category_name: string | null;
      created_at: Date;
    }>
  >(Prisma.sql`
    SELECT
      p.id,
      p.name,
      p.sku,
      p.slug,
      p.is_active,
      p.is_featured,
      p.category_id,
      c.name AS category_name,
      p.created_at
    FROM inventory.products p
    LEFT JOIN inventory.categories c ON c.id = p.category_id
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT ${params.limit}
    OFFSET ${params.offset}
  `);
}

export async function countProductsForAdmin(search?: string) {
  return prisma.product.count({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
  });
}

export async function findProductRecommendations(productId: number, limit = 8) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw<
    Array<{
      id: number;
      slug: string | null;
      name: string;
      price_amount: Prisma.Decimal | null;
      price_currency: string | null;
      image_url: string | null;
      image_alt: string | null;
      score: number;
    }>
  >(Prisma.sql`
    WITH base_product AS (
      SELECT id, category_id
      FROM inventory.products
      WHERE id = ${productId}
      LIMIT 1
    ),
    top_sellers_30 AS (
      SELECT
        si.product_id,
        SUM(si.quantity) AS qty_30d
      FROM inventory.sale_items si
      INNER JOIN inventory.sales s ON s.id = si.sale_id
      WHERE s.sale_date >= (now() - interval '30 days')
        AND s.status IN ('ISSUED', 'PAID')
      GROUP BY si.product_id
    )
    SELECT
      p.id,
      p.slug,
      p.name,
      vp.sale_price AS price_amount,
      vp.currency AS price_currency,
      pi.url AS image_url,
      pi.alt AS image_alt,
      (
        CASE
          WHEN bp.category_id IS NOT NULL AND p.category_id = bp.category_id THEN 1000
          ELSE 0
        END
        + COALESCE(ts.qty_30d, 0)::int
      ) AS score
    FROM inventory.products p
    CROSS JOIN base_product bp
    LEFT JOIN top_sellers_30 ts ON ts.product_id = p.id
    LEFT JOIN LATERAL (
      SELECT pp.sale_price, pp.currency
      FROM inventory.product_prices pp
      INNER JOIN inventory.price_lists pl ON pl.id = pp.price_list_id
      WHERE pp.product_id = p.id
        AND pl.is_default = true
        AND pp.valid_from <= ${today}::date
        AND (pp.valid_to IS NULL OR pp.valid_to >= ${today}::date)
      ORDER BY pp.valid_from DESC
      LIMIT 1
    ) vp ON TRUE
    LEFT JOIN LATERAL (
      SELECT wpi.url, wpi.alt
      FROM webstore.product_images wpi
      WHERE wpi.product_id = p.id
        AND wpi.is_primary = true
      ORDER BY wpi.created_at DESC, wpi.id DESC
      LIMIT 1
    ) pi ON TRUE
    WHERE p.is_active = true
      AND p.id <> ${productId}
    ORDER BY score DESC, p.created_at DESC
    LIMIT ${limit}
  `);

  return rows;
}

export async function listStoreCategoriesWithActiveProductCount(limit = 12) {
  return prisma.$queryRaw<
    Array<{
      id: number;
      name: string;
      active_products_count: bigint;
    }>
  >(Prisma.sql`
    SELECT
      c.id,
      c.name,
      COUNT(p.id)::bigint AS active_products_count
    FROM inventory.categories c
    LEFT JOIN inventory.products p
      ON p.category_id = c.id
      AND p.is_active = true
    GROUP BY c.id, c.name
    ORDER BY COUNT(p.id) DESC, c.name ASC
    LIMIT ${limit}
  `);
}

export async function updateProductById(
  productId: number,
  data: { name?: string; categoryId?: number | null },
) {
  return prisma.product.update({
    where: { id: productId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    },
    select: { id: true, name: true, categoryId: true },
  });
}
