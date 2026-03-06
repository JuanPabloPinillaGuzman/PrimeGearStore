export type CatalogItemDto = {
  id: number;
  sku: string | null;
  slug: string | null;
  name: string;
  category: {
    id: number;
    name: string;
  } | null;
  price: {
    amount: string;
    currency: string;
  } | null;
  image: {
    url: string;
    alt: string | null;
  } | null;
  variants?: CatalogVariantDto[];
};

export type CatalogListQueryDto = {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  sort?: CatalogSort;
  limit: number;
  offset: number;
  expandVariants?: boolean;
};

export type CatalogSort = "RELEVANCE" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST" | "TOP_SELLERS";

export type CatalogListOutputDto = {
  items: CatalogItemDto[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
    total: number;
  };
};

export type ProductDetailDto = {
  id: number;
  sku: string | null;
  slug: string | null;
  name: string;
  category: {
    id: number;
    name: string;
  } | null;
  price: {
    amount: string;
    currency: string;
  } | null;
  image: {
    url: string;
    alt: string | null;
  } | null;
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    sortOrder: number;
    isPrimary: boolean;
  }>;
  isActive: boolean;
  variants: CatalogVariantDto[];
  description: string | null;
  features: Array<{ key: string; value: string }> | null;
  paymentMethods: string[] | null;
};

export type AdminProductDetailDto = {
  id: number;
  name: string;
  sku: string | null;
  slug: string | null;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: number | null;
  categoryName: string | null;
  description: string | null;
  features: Array<{ key: string; value: string }> | null;
  paymentMethods: string[] | null;
  createdAt: string;
};

export type UpdateProductInputDto = {
  name?: string;
  categoryId?: number | null;
  description?: string | null;
  features?: Array<{ key: string; value: string }> | null;
  paymentMethods?: string[] | null;
};

export type ProductRecommendationDto = {
  id: number;
  slug: string | null;
  name: string;
  price: {
    amount: string;
    currency: string;
  } | null;
  image: {
    url: string;
    alt: string | null;
  } | null;
};

export type CatalogVariantDto = {
  id: string;
  sku: string | null;
  name: string;
  attributes: Record<string, unknown>;
  isActive: boolean;
  price: {
    amount: string;
    currency: string;
  } | null;
  stockOnHand?: string;
  availableToSell?: string;
  isInStock?: boolean;
};

export type GenerateSlugsOutputDto = {
  processed: number;
  generated: number;
};

export type CreateProductInputDto = {
  name: string;
  sku?: string;
  categoryId?: number;
};

export type CreateProductOutputDto = {
  id: number;
  name: string;
  sku: string | null;
  categoryId: number | null;
  isActive: boolean;
};

export type AdminProductsListQueryDto = {
  search?: string;
  limit: number;
  offset: number;
};

export type AdminProductsListOutputDto = {
  items: Array<{
    id: number;
    name: string;
    sku: string | null;
    slug: string | null;
    isActive: boolean;
    isFeatured: boolean;
    categoryId: number | null;
    categoryName: string | null;
    createdAt: string;
  }>;
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
};

export type StoreCategoryItemDto = {
  id: number;
  name: string;
  activeProductsCount: number;
};

export type StoreCategoriesOutputDto = {
  items: StoreCategoryItemDto[];
};

export type AdminProductCategoryOptionDto = {
  id: number;
  name: string;
};

export type AdminProductCategoryOptionsOutputDto = {
  items: AdminProductCategoryOptionDto[];
};

export type AdminProductsBulkUpdateInputDto =
  | {
      productIds: number[];
      action: "SET_ACTIVE";
      isActive: boolean;
    }
  | {
      productIds: number[];
      action: "SET_CATEGORY";
      categoryId: number | null;
    };

export type AdminProductsBulkUpdateOutputDto = {
  updatedCount: number;
};
