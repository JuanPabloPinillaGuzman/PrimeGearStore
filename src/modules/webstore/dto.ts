export type AddCartItemInputDto = {
  cartId?: string;
  sessionId?: string;
  productId?: number;
  variantId?: number;
  quantity: number;
};

export type AddCartItemOutputDto = {
  cartId: string;
  item: {
    productId: number;
    variantId: string | null;
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
  couponCode?: string;
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
  couponCode?: string | null;
  bundle?: {
    bundleId: string;
    name: string;
    discountAmount: string;
    discountType: string;
  } | null;
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
  couponCode?: string | null;
  notes: string | null;
  items: Array<{
    id: string;
    productId: number;
    variantId: string | null;
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
    variantId: string | null;
    status: string;
    expiresAt: string;
    quantity: string;
  }>;
  shipment: {
    id: string;
    status: string;
    carrier: string | null;
    service: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
  timeline: Array<{
    status: "PAID" | "PACKING" | "SHIPPED" | "DELIVERED";
    reached: boolean;
  }>;
  payment: {
    provider: string;
    status: string;
    amount: string;
    providerRef: string | null;
    updatedAt: string;
  } | null;
  sale: {
    saleId: string;
    status: string;
    total: string;
    createdAt: string;
    movementOutCount: number;
  } | null;
};

export type CancelOrderInputDto = {
  orderNumber: string;
};

export type MockApprovePaymentInputDto = {
  orderNumber: string;
  amount: string;
};

export type WebhookPaymentInputDto = {
  provider: string;
  providerRef: string;
  orderNumber: string;
  amount: string;
  status: string;
  payload?: unknown;
};

export type PaymentEventResultDto = {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  saleId: string | null;
};

export type MercadoPagoInitInputDto = {
  orderNumber: string;
};

export type MercadoPagoInitOutputDto = {
  initPoint: string;
  preferenceId: string;
};

export type MercadoPagoWebhookResultDto = {
  processed: boolean;
  provider: "MERCADOPAGO";
  topic: string;
  providerRef: string;
  orderNumber: string;
  paymentStatus: string;
  orderStatus: string;
  saleId: string | null;
};

export type AbandonedCartsJobInputDto = {
  inactiveHours: number;
  limit: number;
};

export type AbandonedCartsJobOutputDto = {
  processed: number;
  notified: number;
  skippedNoEmail: number;
};

export type RecoverCartByTokenOutputDto = {
  cartId: string;
  items: Array<{
    id: string;
    productId: number;
    variantId: string | null;
    quantity: string;
    unitPriceSnapshot: string;
    currency: string;
  }>;
};

export type StoreRecommendationsQueryDto = {
  productId: number;
};

export type StoreRecommendationItemDto = {
  id: number;
  slug: string | null;
  name: string;
  price: { amount: string; currency: string } | null;
  image: { url: string; alt: string | null } | null;
};

export type StoreRecommendationsOutputDto = {
  items: StoreRecommendationItemDto[];
};

export type BundleApplicableQueryDto = {
  cartId: string;
};

export type BundleApplicableItemDto = {
  bundleId: string;
  name: string;
  discountType: string;
  discountValue: string;
  estimatedDiscount: string;
};

export type BundleApplicableOutputDto = {
  cartId: string;
  bundles: BundleApplicableItemDto[];
};

export type ApplyBundleInputDto = {
  cartId: string;
  bundleId: string;
};

export type ApplyBundleOutputDto = {
  cartId: string;
  bundleId: string;
  applied: boolean;
};
