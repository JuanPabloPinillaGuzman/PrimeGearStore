import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { bulkUpdateCatalogProductsForAdmin } from "@/modules/catalog/catalog.service";
import { adminProductsBulkSchema } from "@/modules/catalog/catalog.validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(adminProductsBulkSchema, body);
    const data = await bulkUpdateCatalogProductsForAdmin(input);
    return jsonOk({ data });
  } catch (error) {
    return handleRouteError(error, request);
  }
}

