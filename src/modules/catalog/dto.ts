export type CatalogItemDto = {
  id: number;
  sku: string | null;
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
