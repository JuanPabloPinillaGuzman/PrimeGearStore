import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getVariantStock } from "@/modules/variants/service";
import { variantStockQuerySchema } from "@/modules/variants/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseOrThrow(variantStockQuerySchema, Object.fromEntries(url.searchParams.entries()));
    const data = await getVariantStock(query);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

