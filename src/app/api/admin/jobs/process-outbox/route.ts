import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-context";
import { parseOrThrow } from "@/lib/validators/parse";
import { processNotificationOutbox } from "@/modules/notifications/outbox.service";
import { processOutboxQuerySchema } from "@/modules/notifications/validators";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(processOutboxQuerySchema, query);
    const data = await processNotificationOutbox(input.limit);
    logger.info(
      { requestId, durationMs: Date.now() - startedAt, ...data },
      "Notification outbox processing completed.",
    );
    return jsonOk({ data }, 200, request);
  } catch (error) {
    logger.warn(
      { requestId, durationMs: Date.now() - startedAt },
      "Notification outbox processing failed.",
    );
    return handleRouteError(error, request);
  }
}

