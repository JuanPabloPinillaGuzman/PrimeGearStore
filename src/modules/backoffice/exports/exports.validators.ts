import { z } from "zod";

export const csvDateRangeQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});

export const stockCsvQuerySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
});

