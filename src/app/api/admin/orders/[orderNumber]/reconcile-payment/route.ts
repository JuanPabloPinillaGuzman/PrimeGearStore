import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-context";
import { parseOrThrow } from "@/lib/validators/parse";
import { reconcileAdminOrderPayment } from "@/modules/admin-orders/service";
import {
  adminOrderNumberParamsSchema,
  reconcilePaymentSchema,
} from "@/modules/admin-orders/validators";

type Params = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    const routeParams = await params;
    const { orderNumber } = parseOrThrow(adminOrderNumberParamsSchema, routeParams);
    const body = request.headers.get("content-length") === "0" ? {} : await request.json().catch(() => ({}));
    const input = parseOrThrow(reconcilePaymentSchema, body);
    const data = await reconcileAdminOrderPayment({
      orderNumber,
      force: input.force,
    });

    logger.info(
      {
        requestId,
        orderNumber,
        durationMs: Date.now() - startedAt,
      },
      "Admin reconcile payment completed.",
    );
    return jsonOk({ data }, 200, request);
  } catch (error) {
    logger.warn(
      {
        requestId,
        durationMs: Date.now() - startedAt,
      },
      "Admin reconcile payment failed.",
    );
    return handleRouteError(error, request);
  }
}
