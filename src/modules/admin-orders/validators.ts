import { z } from "zod";

export const adminOrdersListQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z
    .enum(["PAID", "PACKING", "SHIPPED", "DELIVERED", "PENDING_PAYMENT", "CANCELLED"])
    .optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const adminOrderNumberParamsSchema = z.object({
  orderNumber: z.string().trim().min(1).max(50),
});

export const reconcilePaymentSchema = z
  .object({
    force: z.boolean().optional(),
  })
  .default({});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PACKING", "SHIPPED", "DELIVERED"]),
});
