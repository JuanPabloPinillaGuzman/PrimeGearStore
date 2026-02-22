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
  limit: number;
  offset: number;
  expandVariants?: boolean;
};

export type CatalogListOutputDto = {
  items: CatalogItemDto[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
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
  isActive: boolean;
  variants: CatalogVariantDto[];
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
