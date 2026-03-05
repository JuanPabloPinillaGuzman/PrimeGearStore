import { z } from "zod";

export const importProductsCsvRowSchema = z.object({
  productId: z.number().int().positive().optional(),
  sku: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(180),
  categoryId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
  slug: z.string().trim().min(1).max(220).optional(),
});

export const importVariantsCsvRowSchema = z.object({
  variantId: z.bigint().positive().optional(),
  productId: z.number().int().positive(),
  sku: z.string().trim().min(1).max(60).optional(),
  name: z.string().trim().min(1).max(120),
  attributes: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().optional(),
});

