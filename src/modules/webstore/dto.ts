export type AddCartItemInputDto = {
  cartId?: string;
  sessionId?: string;
  productId: number;
  quantity: number;
};

export type AddCartItemOutputDto = {
  cartId: string;
  item: {
    productId: number;
    quantity: string;
    unitPriceSnapshot: string;
    currency: string;
  };
};

export type CheckoutInputDto = {
  cartId: string;
  customerId?: number;
  branchId?: number;
  notes?: string;
};

export type CheckoutOutputDto = {
  orderNumber: string;
  orderId: string;
  status: string;
  totals: {
    subtotal: string;
    discountTotal: string;
    taxTotal: string;
    shippingTotal: string;
    total: string;
    currency: string;
  };
  expiresAt: string;
};

export type OrderDetailsDto = {
  orderId: string;
  orderNumber: string;
  status: string;
  currency: string;
  totals: {
    subtotal: string;
    discountTotal: string;
    taxTotal: string;
    shippingTotal: string;
    total: string;
  };
  notes: string | null;
  items: Array<{
    id: string;
    productId: number;
    quantity: string;
    unitPriceSnapshot: string;
    discountAmount: string;
    taxAmount: string;
    lineSubtotal: string;
    lineTotal: string;
  }>;
  reservations: Array<{
    id: string;
    productId: number;
    status: string;
    expiresAt: string;
    quantity: string;
  }>;
  shipment: {
    id: string;
    status: string;
    trackingNumber: string | null;
  } | null;
};

export type CancelOrderInputDto = {
  orderNumber: string;
};
