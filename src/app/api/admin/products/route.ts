import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { createCatalogProduct } from "@/modules/catalog/service";
import { createProductSchema } from "@/modules/catalog/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(createProductSchema, body);
    const data = await createCatalogProduct(input);

    return jsonOk({ data }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
