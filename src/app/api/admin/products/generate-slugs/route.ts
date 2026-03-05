import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { generateProductSlugs } from "@/modules/catalog/catalog.service";
import { generateSlugsQuerySchema } from "@/modules/catalog/catalog.validators";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const query = parseOrThrow(generateSlugsQuerySchema, Object.fromEntries(url.searchParams.entries()));
    const data = await generateProductSlugs(query.limit);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

