import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { createCatalogProduct, listCatalogProductsForAdmin } from "@/modules/catalog/service";
import { adminProductsListQuerySchema, createProductSchema } from "@/modules/catalog/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(adminProductsListQuerySchema, query);
    const data = await listCatalogProductsForAdmin(input);
    return jsonOk({ data });
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(createProductSchema, body);
    const data = await createCatalogProduct(input);

    return jsonOk({ data }, 201);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

