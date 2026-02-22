import { z } from "zod";

export const createPurchaseSchema = z.object({
  supplierId: z.number().int().positive(),
  branchId: z.number().int().positive().optional(),
  purchaseDate: z.string().datetime().optional(),
  currency: z.literal("COP").optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        variantId: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]).optional(),
        quantity: z.number().positive(),
        unitCost: z.number().nonnegative(),
      }),
    )
    .min(1),
});

export const inventoryAdjustSchema = z.object({
  branchId: z.number().int().positive().optional(),
  productId: z.number().int().positive(),
  quantity: z.number().positive(),
  direction: z.enum(["IN", "OUT"]),
  unitCost: z.number().nonnegative().optional(),
  reason: z.string().trim().max(200).optional(),
});

export const inventoryStockQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const salesDailyQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

export const topProductsQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const profitDailyQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

export const profitTopVariantsQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  limit: z.coerce.number().int().positive().max(100).default(10),
});
