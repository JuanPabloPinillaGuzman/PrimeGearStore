import { z } from "zod";

export const addCartItemSchema = z
  .object({
    cartId: z.string().uuid().optional(),
    sessionId: z.string().trim().min(1).max(200).optional(),
    productId: z.number().int().positive().optional(),
    variantId: z.number().int().positive().optional(),
    quantity: z.number().positive(),
  })
  .refine((value) => !!value.cartId || !!value.sessionId, {
    message: "Either cartId or sessionId must be provided.",
    path: ["cartId"],
  })
  .refine((value) => !!value.variantId || !!value.productId, {
    message: "variantId or productId is required.",
    path: ["variantId"],
  });

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  customerId: z.number().int().positive().optional(),
  branchId: z.number().int().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
  couponCode: z.string().trim().min(1).max(40).optional(),
});

export const recoverCartQuerySchema = z.object({
  token: z.string().trim().min(16).max(120),
});

export const storeRecommendationsQuerySchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const bundleApplicableQuerySchema = z.object({
  cartId: z.string().uuid(),
});

export const applyBundleSchema = z.object({
  cartId: z.string().uuid(),
  bundleId: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]),
});

export const abandonedCartsJobQuerySchema = z.object({
  inactiveHours: z.coerce.number().int().positive().max(24 * 30).default(24),
  limit: z.coerce.number().int().positive().max(500).default(50),
});

export const orderNumberParamsSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
});

export const mockApprovePaymentSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
});

export const paymentWebhookSchema = z.object({
  provider: z.string().trim().min(1).max(50),
  providerRef: z.string().trim().min(1).max(120),
  orderNumber: z.string().trim().min(1).max(50),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/),
  status: z.string().trim().min(1).max(30),
  payload: z.unknown().optional(),
});

export const mercadoPagoInitSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
});

export const mercadoPagoWebhookBodySchema = z.object({
  type: z.string().optional(),
  topic: z.string().optional(),
  action: z.string().optional(),
  data: z
    .object({
      id: z.string().or(z.number()),
    })
    .optional(),
});

export const mercadoPagoWebhookQuerySchema = z.object({
  type: z.string().optional(),
  topic: z.string().optional(),
  "data.id": z.string().optional(),
  id: z.string().optional(),
});
