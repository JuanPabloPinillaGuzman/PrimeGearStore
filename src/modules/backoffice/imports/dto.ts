export type CsvImportRowErrorDto = {
  row: number;
  message: string;
};

export type CsvImportResultDto = {
  created: number;
  updated: number;
  failed: number;
  errors: CsvImportRowErrorDto[];
};

export type ImportProductCsvRow = {
  productId?: number;
  sku?: string;
  name: string;
  categoryId?: number | null;
  isActive?: boolean;
  slug?: string;
};

export type ImportVariantCsvRow = {
  variantId?: bigint;
  productId: number;
  sku?: string;
  name: string;
  attributes: Record<string, unknown>;
  isActive?: boolean;
};

