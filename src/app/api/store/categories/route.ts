import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { getStoreCategories } from "@/modules/catalog/service";

export async function GET(request: Request) {
  try {
    const data = await getStoreCategories();
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
