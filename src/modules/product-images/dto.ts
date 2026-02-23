export type ProductImageItemDto = {
  id: string;
  productId: number;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
};

export type ProductImageListOutputDto = {
  productId: number;
  items: ProductImageItemDto[];
};

export type CreateProductImageInputDto = {
  url: string;
  alt?: string;
  isPrimary?: boolean;
};

export type UpdateProductImageInputDto = {
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
};
