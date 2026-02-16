import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(180),
  sku: z.string().trim().min(1).max(60).optional(),
  categoryId: z.number().int().positive().optional(),
});
