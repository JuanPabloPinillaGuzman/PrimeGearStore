import { handleRouteError } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { exportSalesCsv } from "@/modules/backoffice/exports/service";
import { csvDateRangeQuerySchema } from "@/modules/backoffice/exports/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(csvDateRangeQuerySchema, query);
    const csv = await exportSalesCsv(input);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sales-${input.from}-${input.to}.csv"`,
      },
    });
  } catch (error) {
    return handleRouteError(error, request);
  }
}

