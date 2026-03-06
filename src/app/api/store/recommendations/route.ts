import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getStoreRecommendations } from "@/modules/catalog/catalog.service";
import { storeRecommendationsQuerySchema } from "@/modules/webstore/webstore.validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(storeRecommendationsQuerySchema, query);
    const data = await getStoreRecommendations(input.productId);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
