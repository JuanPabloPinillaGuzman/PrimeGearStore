export type WishlistProductDto = {
  productId: number;
  slug: string | null;
  name: string;
  sku: string | null;
  category: { id: number; name: string } | null;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
  isActive: boolean;
};

export type WishlistListOutputDto = {
  items: WishlistProductDto[];
};

export type WishlistToggleInputDto = {
  productId: number;
};

export type WishlistToggleOutputDto = {
  added: boolean;
  productId: number;
};

export type WishlistMergeInputDto = {
  productIds: number[];
};

export type WishlistMergeOutputDto = {
  addedCount: number;
  totalCount: number;
};

export type PersonalizedRecommendationsOutputDto = {
  items: WishlistProductDto[];
};

