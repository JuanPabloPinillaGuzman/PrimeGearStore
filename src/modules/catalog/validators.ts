import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(180),
  sku: z.string().trim().min(1).max(60).optional(),
  categoryId: z.number().int().positive().optional(),
});

export const catalogListQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().positive().max(100).default(24),
  offset: z.coerce.number().int().nonnegative().default(0),
  expand: z.string().trim().optional(),
});

export const generateSlugsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(5000).default(500),
});
