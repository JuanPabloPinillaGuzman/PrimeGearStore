import { jsonOk, handleRouteError } from "@/lib/errors/http";
import { getCatalogItems } from "@/modules/catalog/service";

export async function GET() {
  try {
    const data = await getCatalogItems();
    return jsonOk({ data });
  } catch (error) {
    return handleRouteError(error);
  }
}
