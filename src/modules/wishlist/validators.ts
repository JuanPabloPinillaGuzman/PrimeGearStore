import { z } from "zod";

export const wishlistToggleSchema = z.object({
  productId: z.number().int().positive(),
});

export const wishlistMergeSchema = z.object({
  productIds: z.array(z.number().int().positive()).min(1).max(500),
});

export const meRecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(24).default(8),
});

