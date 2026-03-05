import { z } from "zod";

export const fulfillmentStatusSchema = z.object({
  status: z.enum(["PACKING", "SHIPPED", "DELIVERED"]),
});

export const createShipmentSchema = z.object({
  carrier: z.string().trim().max(80).optional(),
  service: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().min(1).max(120),
});

export const updateShipmentSchema = z
  .object({
    carrier: z.string().trim().max(80).optional(),
    service: z.string().trim().max(80).optional(),
    trackingNumber: z.string().trim().min(1).max(120).optional(),
    status: z.enum(["PENDING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "RETURNED"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });
