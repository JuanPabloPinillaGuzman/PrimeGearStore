import { handleRouteError } from "@/lib/errors/http";
import { exportProductsCsv } from "@/modules/backoffice/exports/exports.service";

export async function GET(request: Request) {
  try {
    const csv = await exportProductsCsv();
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="products.csv"',
      },
    });
  } catch (error) {
    return handleRouteError(error, request);
  }
}

