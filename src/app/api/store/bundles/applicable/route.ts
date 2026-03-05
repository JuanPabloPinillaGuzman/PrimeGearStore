import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getApplicableBundles } from "@/modules/webstore/webstore.service";
import { bundleApplicableQuerySchema } from "@/modules/webstore/webstore.validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(bundleApplicableQuerySchema, query);
    const data = await getApplicableBundles(input);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
