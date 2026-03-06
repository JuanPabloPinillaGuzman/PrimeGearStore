import { z } from "zod";

export const processOutboxQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});

