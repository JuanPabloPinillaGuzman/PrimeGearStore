import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import { resolveCustomerContext } from "@/modules/account/service";
import type {
  PersonalizedRecommendationsOutputDto,
  WishlistListOutputDto,
  WishlistMergeInputDto,
  WishlistMergeOutputDto,
  WishlistToggleInputDto,
  WishlistToggleOutputDto,
} from "@/modules/wishlist/dto";
import {
  countWishlistItems,
  deleteWishlistItem,
  findOrCreateWishlistByCustomerId,
  findProductByIdForWishlist,
  findWishlistItemByProductId,
  insertWishlistItem,
  insertWishlistItemsIgnoreConflicts,
  listPersonalizedRecommendationsByCustomerId,
  listWishlistProductsByCustomerId,
} from "@/modules/wishlist/repo";

type SessionUser = { email?: string | null; name?: string | null; role?: string | null };
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function mapWishlistProduct(
  row: Awaited<ReturnType<typeof listWishlistProductsByCustomerId>>[number] |
    Awaited<ReturnType<typeof listPersonalizedRecommendationsByCustomerId>>[number],
) {
  return {
    productId: row.product_id,
    slug: row.slug,
    sku: row.sku,
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
    image: row.image_url
      ? {
          url: row.image_url,
          alt: row.image_alt,
        }
      : null,
    isActive: row.is_active,
  };
}

async function ensureCustomer(sessionUser: SessionUser) {
  const me = await resolveCustomerContext(sessionUser);
  if (me.role !== "CUSTOMER") {
    throw new AppError("FORBIDDEN", 403, "Customer account required.");
  }
  if (!me.customer) {
    throw new AppError("NOT_FOUND", 404, "Customer profile not found.");
  }
  return me.customer;
}

export async function getMyWishlist(sessionUser: SessionUser): Promise<WishlistListOutputDto> {
  const customer = await ensureCustomer(sessionUser);
  const rows = await listWishlistProductsByCustomerId(customer.id);
  return { items: rows.map(mapWishlistProduct) };
}

export async function toggleMyWishlistItem(
  sessionUser: SessionUser,
  input: WishlistToggleInputDto,
): Promise<WishlistToggleOutputDto> {
  const customer = await ensureCustomer(sessionUser);
  const product = await findProductByIdForWishlist(input.productId);
  if (!product || !product.isActive) {
    throw new AppError("NOT_FOUND", 404, "Product not found.");
  }

  return prisma.$transaction(async (tx: TxClient) => {
    const wishlist = await findOrCreateWishlistByCustomerId(customer.id, tx);
    const existing = await findWishlistItemByProductId(wishlist.id, input.productId, tx);
    if (existing) {
      await deleteWishlistItem(wishlist.id, input.productId, tx);
      return { added: false, productId: input.productId };
    }
    await insertWishlistItem(wishlist.id, input.productId, tx);
    return { added: true, productId: input.productId };
  });
}

export async function mergeMyWishlist(
  sessionUser: SessionUser,
  input: WishlistMergeInputDto,
): Promise<WishlistMergeOutputDto> {
  const customer = await ensureCustomer(sessionUser);
  const uniqueProductIds = Array.from(new Set(input.productIds));

  const existingProducts = await prisma.product.findMany({
    where: {
      id: { in: uniqueProductIds },
      isActive: true,
    },
    select: { id: true },
  });
  const validProductIds = existingProducts.map((row: { id: number }) => row.id);

  return prisma.$transaction(async (tx: TxClient) => {
    const wishlist = await findOrCreateWishlistByCustomerId(customer.id, tx);
    const inserted = await insertWishlistItemsIgnoreConflicts(wishlist.id, validProductIds, tx);
    const totalCount = await countWishlistItems(wishlist.id);
    return {
      addedCount: inserted.count,
      totalCount,
    };
  });
}

export async function getMyPersonalizedRecommendations(
  sessionUser: SessionUser,
  limit: number,
): Promise<PersonalizedRecommendationsOutputDto> {
  const customer = await ensureCustomer(sessionUser);
  const rows = await listPersonalizedRecommendationsByCustomerId(customer.id, limit);
  return { items: rows.map(mapWishlistProduct) };
}
