import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getProfitTopVariantsReport } from "@/modules/backoffice/backoffice.service";
import { profitTopVariantsQuerySchema } from "@/modules/backoffice/backoffice.validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(profitTopVariantsQuerySchema, query);
    const data = await getProfitTopVariantsReport(input);
    return jsonOk({ data });
  } catch (error) {
    return handleRouteError(error, request);
  }
}
