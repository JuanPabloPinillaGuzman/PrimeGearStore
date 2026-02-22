import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getDailySalesReport } from "@/modules/backoffice/service";
import { salesDailyQuerySchema } from "@/modules/backoffice/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(salesDailyQuerySchema, query);
    const data = await getDailySalesReport(input);
    return jsonOk({ data });
  } catch (error) {
    return handleRouteError(error, request);
  }
}

