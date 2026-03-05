import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type DbClient = TxClient | typeof prisma;

function clientOf(tx?: TxClient): DbClient {
  return tx ?? prisma;
}

export async function findOrCreateWishlistByCustomerId(customerId: number, tx?: TxClient) {
  return clientOf(tx).wishlist.upsert({
    where: { customerId },
    update: {},
    create: { customerId },
    select: { id: true, customerId: true },
  });
}

export async function findWishlistByCustomerId(customerId: number) {
  return prisma.wishlist.findUnique({
    where: { customerId },
    select: { id: true, customerId: true },
  });
}

export async function findWishlistItemByProductId(wishlistId: bigint, productId: number, tx?: TxClient) {
  return clientOf(tx).wishlistItem.findUnique({
    where: {
      wishlistId_productId: {
        wishlistId,
        productId,
      },
    },
    select: { id: true, productId: true },
  });
}

export async function insertWishlistItem(wishlistId: bigint, productId: number, tx?: TxClient) {
  return clientOf(tx).wishlistItem.create({
    data: {
      wishlistId,
      productId,
    },
    select: { id: true, productId: true },
  });
}

export async function deleteWishlistItem(wishlistId: bigint, productId: number, tx?: TxClient) {
  return clientOf(tx).wishlistItem.deleteMany({
    where: {
      wishlistId,
      productId,
    },
  });
}

export async function insertWishlistItemsIgnoreConflicts(
  wishlistId: bigint,
  productIds: number[],
  tx?: TxClient,
) {
  if (productIds.length === 0) return { count: 0 };
  return clientOf(tx).wishlistItem.createMany({
    data: productIds.map((productId) => ({ wishlistId, productId })),
    skipDuplicates: true,
  });
}

export async function countWishlistItems(wishlistId: bigint) {
  return prisma.wishlistItem.count({ where: { wishlistId } });
}

export async function listWishlistProductsByCustomerId(customerId: number) {
  const today = new Date().toISOString().slice(0, 10);
  return prisma.$queryRaw<
    Array<{
      product_id: number;
      slug: string | null;
      sku: string | null;
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
      p.id AS product_id,
      p.slug,
      p.sku,
      p.name,
      p.category_id,
      c.name AS category_name,
      vp.sale_price AS price_amount,
      vp.currency AS price_currency,
      pi.url AS image_url,
      pi.alt AS image_alt,
      p.is_active
    FROM webstore.wishlists w
    INNER JOIN webstore.wishlist_items wi ON wi.wishlist_id = w.id
    INNER JOIN inventory.products p ON p.id = wi.product_id
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
    WHERE w.customer_id = ${customerId}
      AND p.is_active = true
    ORDER BY wi.created_at DESC, wi.id DESC
  `);
}

export async function findProductByIdForWishlist(productId: number) {
  return prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true },
  });
}

export async function listPersonalizedRecommendationsByCustomerId(customerId: number, limit: number) {
  const today = new Date().toISOString().slice(0, 10);
  return prisma.$queryRaw<
    Array<{
      product_id: number;
      slug: string | null;
      sku: string | null;
      name: string;
      category_id: number | null;
      category_name: string | null;
      price_amount: Prisma.Decimal | null;
      price_currency: string | null;
      image_url: string | null;
      image_alt: string | null;
      is_active: boolean;
      score: number;
    }>
  >(Prisma.sql`
    WITH my_wishlist AS (
      SELECT wi.product_id
      FROM webstore.wishlists w
      INNER JOIN webstore.wishlist_items wi ON wi.wishlist_id = w.id
      WHERE w.customer_id = ${customerId}
    ),
    pref_categories AS (
      SELECT p.category_id
      FROM inventory.products p
      INNER JOIN my_wishlist mw ON mw.product_id = p.id
      WHERE p.category_id IS NOT NULL
      UNION ALL
      SELECT p2.category_id
      FROM inventory.sales s
      INNER JOIN inventory.sale_items si ON si.sale_id = s.id
      INNER JOIN inventory.products p2 ON p2.id = si.product_id
      WHERE s.customer_id = ${customerId}
        AND s.sale_date >= (now() - interval '180 days')
        AND p2.category_id IS NOT NULL
    ),
    pref_category_weights AS (
      SELECT category_id, COUNT(*)::int AS weight
      FROM pref_categories
      GROUP BY category_id
    ),
    top_sellers_30 AS (
      SELECT si.product_id, COALESCE(SUM(si.quantity), 0)::int AS qty_30d
      FROM inventory.sale_items si
      INNER JOIN inventory.sales s ON s.id = si.sale_id
      WHERE s.sale_date >= (now() - interval '30 days')
        AND s.status IN ('ISSUED', 'PAID')
      GROUP BY si.product_id
    )
    SELECT
      p.id AS product_id,
      p.slug,
      p.sku,
      p.name,
      p.category_id,
      c.name AS category_name,
      vp.sale_price AS price_amount,
      vp.currency AS price_currency,
      pi.url AS image_url,
      pi.alt AS image_alt,
      p.is_active,
      (COALESCE(pcw.weight, 0) * 100 + COALESCE(ts.qty_30d, 0))::int AS score
    FROM inventory.products p
    LEFT JOIN inventory.categories c ON c.id = p.category_id
    LEFT JOIN pref_category_weights pcw ON pcw.category_id = p.category_id
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
      AND NOT EXISTS (SELECT 1 FROM my_wishlist mw WHERE mw.product_id = p.id)
    ORDER BY score DESC, p.created_at DESC
    LIMIT ${limit}
  `);
}

