import { handleRouteError } from "@/lib/errors/http";
import { exportVariantsCsv } from "@/modules/backoffice/exports/service";

export async function GET(request: Request) {
  try {
    const csv = await exportVariantsCsv();
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="variants.csv"',
      },
    });
  } catch (error) {
    return handleRouteError(error, request);
  }
}

