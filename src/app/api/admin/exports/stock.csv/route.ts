import { handleRouteError } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { exportStockCsv } from "@/modules/backoffice/exports/exports.service";
import { stockCsvQuerySchema } from "@/modules/backoffice/exports/exports.validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(stockCsvQuerySchema, query);
    const csv = await exportStockCsv(input);
    const suffix = input.branchId ? `branch-${input.branchId}` : "all";
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="stock-${suffix}.csv"`,
      },
    });
  } catch (error) {
    return handleRouteError(error, request);
  }
}

