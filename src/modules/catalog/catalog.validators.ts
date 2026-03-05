import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(180),
  sku: z.string().trim().min(1).max(60).optional(),
  categoryId: z.number().int().positive().optional(),
});

export const adminProductsBulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SET_ACTIVE"),
    productIds: z.array(z.number().int().positive()).min(1).max(1000),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal("SET_CATEGORY"),
    productIds: z.array(z.number().int().positive()).min(1).max(1000),
    categoryId: z.number().int().positive().nullable(),
  }),
]);

export const adminProductsListQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().positive().max(500).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const catalogListQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z
    .union([z.literal("1"), z.literal("0"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional(),
  sort: z.enum(["RELEVANCE", "PRICE_ASC", "PRICE_DESC", "NEWEST", "TOP_SELLERS"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(24),
  offset: z.coerce.number().int().nonnegative().default(0),
  expand: z.string().trim().optional(),
})
  .refine((value) => value.maxPrice === undefined || value.minPrice === undefined || value.maxPrice >= value.minPrice, {
    message: "maxPrice must be greater than or equal to minPrice",
    path: ["maxPrice"],
  });

export const generateSlugsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(5000).default(500),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(180).optional(),
    categoryId: z.number().int().positive().nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.categoryId !== undefined, {
    message: "At least one field is required.",
  });
