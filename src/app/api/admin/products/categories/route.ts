import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { listCatalogProductCategoryOptionsForAdmin } from "@/modules/catalog/catalog.service";

export async function GET(request: Request) {
  try {
    const data = await listCatalogProductCategoryOptionsForAdmin();
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

