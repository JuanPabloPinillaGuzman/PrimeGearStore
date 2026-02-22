import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-context";
import { expireReservationsJob } from "@/modules/webstore/jobs.service";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    const data = await expireReservationsJob();
    logger.info(
      { requestId, durationMs: Date.now() - startedAt, ...data },
      "Expire reservations job completed.",
    );
    return jsonOk({ data }, 200, request);
  } catch (error) {
    logger.warn(
      { requestId, durationMs: Date.now() - startedAt },
      "Expire reservations job failed.",
    );
    return handleRouteError(error, request);
  }
}
