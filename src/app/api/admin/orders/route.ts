import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-context";
import { parseOrThrow } from "@/lib/validators/parse";
import { listAdminOrders } from "@/modules/admin-orders/admin-orders.service";
import { adminOrdersListQuerySchema } from "@/modules/admin-orders/admin-orders.validators";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(adminOrdersListQuerySchema, query);
    const data = await listAdminOrders(input);
    logger.info({ requestId, durationMs: Date.now() - startedAt }, "Admin orders list completed.");
    return jsonOk({ data });
  } catch (error) {
    logger.warn(
      { requestId, durationMs: Date.now() - startedAt },
      "Admin orders list failed.",
    );
    return handleRouteError(error, request);
  }
}
