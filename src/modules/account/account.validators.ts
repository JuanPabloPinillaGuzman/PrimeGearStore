import { z } from "zod";

export const meOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

const addressTypeSchema = z.enum(["SHIPPING", "BILLING"]);

export const createCustomerAddressSchema = z.object({
  type: addressTypeSchema.default("SHIPPING"),
  fullName: z.string().trim().min(1).max(150),
  phone: z.string().trim().min(1).max(50),
  country: z.string().trim().min(2).max(80).default("CO"),
  department: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120),
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
  isDefault: z.boolean().optional().default(false),
});

export const updateCustomerAddressSchema = z
  .object({
    type: addressTypeSchema.optional(),
    fullName: z.string().trim().min(1).max(150).optional(),
    phone: z.string().trim().min(1).max(50).optional(),
    country: z.string().trim().min(2).max(80).optional(),
    department: z.string().trim().min(1).max(120).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    addressLine1: z.string().trim().min(1).max(200).optional(),
    addressLine2: z.string().trim().max(200).optional(),
    postalCode: z.string().trim().max(20).optional(),
    notes: z.string().trim().max(2000).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const customerAddressIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});
