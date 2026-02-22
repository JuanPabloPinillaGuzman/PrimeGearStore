export type CreatePurchaseInputDto = {
  supplierId: number;
  branchId?: number;
  purchaseDate?: string;
  currency?: "COP";
  items: Array<{
    productId: number;
    variantId?: string | number;
    quantity: number;
    unitCost: number;
  }>;
};

export type CreatePurchaseOutputDto = {
  purchaseId: string;
  supplierId: number;
  branchId: number | null;
  currency: string;
  totals: {
    subtotal: string;
    taxTotal: string;
    total: string;
  };
  itemsCount: number;
};

export type InventoryAdjustInputDto = {
  branchId?: number;
  productId: number;
  quantity: number;
  direction: "IN" | "OUT";
  unitCost?: number;
  reason?: string;
};

export type InventoryAdjustOutputDto = {
  movementId: string;
  movementType: "IN" | "OUT";
  productId: number;
  quantity: string;
  unitCost: string;
  branchId: number | null;
};

export type InventoryStockQueryDto = {
  branchId?: number;
  search?: string;
  limit: number;
  offset: number;
};

export type InventoryStockItemDto = {
  productId: number;
  sku: string | null;
  name: string;
  branchId: number | null;
  stockOnHand: string;
};

export type InventoryStockOutputDto = {
  items: InventoryStockItemDto[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
};

export type SalesDailyQueryDto = {
  from: string;
  to: string;
};

export type SalesDailyItemDto = {
  day: string;
  salesCount: number;
  salesTotal: string;
};

export type TopProductsQueryDto = {
  from: string;
  to: string;
  limit: number;
};

export type TopProductItemDto = {
  productId: number;
  sku: string | null;
  name: string;
  quantity: string;
  total: string;
};

export type ProfitDailyQueryDto = {
  from: string;
  to: string;
};

export type ProfitDailyItemDto = {
  day: string;
  totalSales: string;
  totalCogs: string;
  grossProfit: string;
};

export type ProfitTopVariantsQueryDto = {
  from: string;
  to: string;
  limit: number;
};

export type ProfitTopVariantItemDto = {
  variantId: string;
  productId: number;
  productName: string;
  variantName: string;
  variantSku: string | null;
  quantity: string;
  totalSales: string;
  totalCogs: string;
  grossProfit: string;
};
