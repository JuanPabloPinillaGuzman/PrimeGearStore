export type AdminOrdersListQueryDto = {
  search?: string;
  status?: "PAID" | "PACKING" | "SHIPPED" | "DELIVERED" | "PENDING_PAYMENT" | "CANCELLED";
  limit: number;
  offset: number;
};

export type ReconcilePaymentInputDto = {
  orderNumber: string;
  force?: boolean;
};

export type UpdateOrderStatusInputDto = {
  orderNumber: string;
  status: "PACKING" | "SHIPPED" | "DELIVERED";
  adminUserId?: string;
};
