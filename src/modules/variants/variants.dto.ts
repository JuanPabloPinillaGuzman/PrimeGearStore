export type VariantAttributesDto = Record<string, unknown>;

export type CreateVariantInputDto = {
  productId: number;
  sku?: string;
  name: string;
  attributes: VariantAttributesDto;
  isActive?: boolean;
};

export type UpdateVariantInputDto = {
  productId: number;
  variantId: string;
  sku?: string;
  name?: string;
  attributes?: VariantAttributesDto;
  isActive?: boolean;
};

export type CreateVariantPriceInputDto = {
  productId: number;
  variantId: string;
  priceListId: number;
  salePrice: number;
  currency?: "COP";
  validFrom?: string;
  validTo?: string | null;
};

