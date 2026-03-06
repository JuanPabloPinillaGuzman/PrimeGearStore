import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { getRequestId } from "@/lib/request-context";
import { processMercadoPagoWebhook } from "@/modules/webstore/mercadopago.service";
import {
  mercadoPagoWebhookBodySchema,
  mercadoPagoWebhookQuerySchema,
} from "@/modules/webstore/webstore.validators";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = getRequestId(request);
  try {
    const contentType = request.headers.get("content-type");
    if (contentType && !contentType.toLowerCase().includes("application/json")) {
      throw new AppError("BAD_REQUEST", 400, "Unsupported content type.");
    }

    const contentLengthRaw = request.headers.get("content-length");
    if (contentLengthRaw) {
      const contentLength = Number(contentLengthRaw);
      if (Number.isFinite(contentLength) && contentLength > 256 * 1024) {
        throw new AppError("BAD_REQUEST", 400, "Webhook payload too large.");
      }
    }

    const rawBody = await request.text();
    const parsedBodyRaw = rawBody ? (JSON.parse(rawBody) as unknown) : {};
    const body = mercadoPagoWebhookBodySchema.parse(parsedBodyRaw);

    const url = new URL(request.url);
    const query = mercadoPagoWebhookQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));

    const type = query.type ?? query.topic ?? body.type ?? body.topic ?? body.action ?? "payment";
    const dataId =
      query["data.id"] ?? query.id ?? (body.data?.id ? String(body.data.id) : undefined);

    const data = await processMercadoPagoWebhook({
      queryType: type,
      bodyType: body.type ?? body.topic ?? body.action,
      dataId,
      rawBody,
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
    });

    logger.info(
      {
        requestId,
        topic: data.topic,
        providerRef: data.providerRef,
        durationMs: Date.now() - startedAt,
      },
      "Mercado Pago webhook processed.",
    );
    return jsonOk({ data }, 200, request);
  } catch (error) {
    logger.warn(
      {
        requestId,
        durationMs: Date.now() - startedAt,
      },
      "Mercado Pago webhook rejected.",
    );
    return handleRouteError(error, request);
  }
}
