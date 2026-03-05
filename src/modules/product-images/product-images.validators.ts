import { z } from "zod";

export const productIdParamsSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

export const productImageParamsSchema = z.object({
  productId: z.coerce.number().int().positive(),
  imageId: z.coerce.number().int().positive(),
});

export const createProductImageSchema = z.object({
  url: z.string().trim().url().max(2000),
  alt: z.string().trim().max(500).optional(),
  isPrimary: z.boolean().optional(),
});

export const updateProductImageSchema = z
  .object({
    alt: z.string().trim().max(500).optional(),
    isPrimary: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });
