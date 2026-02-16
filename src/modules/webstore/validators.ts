import { z } from "zod";

export const addCartItemSchema = z
  .object({
    cartId: z.string().uuid().optional(),
    sessionId: z.string().trim().min(1).max(200).optional(),
    productId: z.number().int().positive(),
    quantity: z.number().positive(),
  })
  .refine((value) => !!value.cartId || !!value.sessionId, {
    message: "Either cartId or sessionId must be provided.",
    path: ["cartId"],
  });

export const checkoutSchema = z.object({
  cartId: z.string().uuid(),
  customerId: z.number().int().positive().optional(),
  branchId: z.number().int().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const orderNumberParamsSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
});
