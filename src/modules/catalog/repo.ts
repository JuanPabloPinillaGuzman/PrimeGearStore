import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function findActiveProductsForCatalog(params: {
  search?: string;
  limit: number;
  offset: number;
}) {
  const conditions: Prisma.Sql[] = [Prisma.sql`p.is_active = true`];

  if (params.search) {
    const like = `%${params.search}%`;
    conditions.push(Prisma.sql`(p.name ILIKE ${like} OR p.sku ILIKE ${like})`);
  }

  const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
  const today = new Date().toISOString().slice(0, 10);

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
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT ${params.limit}
    OFFSET ${params.offset}
  `);
}

export async function countActiveProductsForCatalog(search?: string) {
  const conditions: Prisma.Sql[] = [Prisma.sql`is_active = true`];

  if (search) {
    const like = `%${search}%`;
    conditions.push(Prisma.sql`(name ILIKE ${like} OR sku ILIKE ${like})`);
  }

  const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM inventory.products
    ${whereSql}
  `);

  return Number(rows[0]?.count ?? 0);
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
