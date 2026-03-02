import { z } from "zod";

export const productIdParamsSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const productVariantParamsSchema = z.object({
  productId: z.coerce.number().int().positive(),
  variantId: z.string().regex(/^\d+$/),
});

export const variantIdParamsSchema = z.object({
  variantId: z.string().regex(/^\d+$/),
});

export const variantStockQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const createVariantSchema = z.object({
  sku: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(120),
  attributes: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().optional(),
});

export const updateVariantSchema = z
  .object({
    sku: z.string().trim().min(1).max(60).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createVariantPriceSchema = z.object({
  priceListId: z.number().int().positive(),
  salePrice: z.number().nonnegative(),
  currency: z.literal("COP").optional(),
  validFrom: z.string().date().optional(),
  validTo: z.string().date().nullable().optional(),
});
