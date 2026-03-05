import { z } from "zod";

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  cartId: z.string().uuid(),
});

export const adminCouponCodeParamsSchema = z.object({
  code: z.string().trim().min(1).max(40),
});

export const createCouponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().nonnegative(),
  currency: z.literal("COP").optional(),
  minSubtotal: z.number().nonnegative().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateCouponSchema = z
  .object({
    type: z.enum(["PERCENT", "FIXED"]).optional(),
    value: z.number().nonnegative().optional(),
    currency: z.literal("COP").optional(),
    minSubtotal: z.number().nonnegative().optional(),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    maxRedemptions: z.number().int().positive().optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

