import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getCatalogProductDetailBySlugWithStock } from "@/modules/catalog/catalog.service";
import { z } from "zod";

const paramsSchema = z.object({
  slug: z.string().trim().min(1).max(220),
});

const querySchema = z.object({
  branchId: z.coerce.number().int().positive().optional(),
});

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const routeParams = await params;
    const { slug } = parseOrThrow(paramsSchema, routeParams);
    const url = new URL(request.url);
    const query = parseOrThrow(querySchema, Object.fromEntries(url.searchParams.entries()));
    const data = await getCatalogProductDetailBySlugWithStock(slug, {
      branchId: query.branchId,
    });
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
