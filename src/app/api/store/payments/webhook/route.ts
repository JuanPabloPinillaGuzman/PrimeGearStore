import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { recordPaymentEvent } from "@/modules/webstore/payment.service";
import { paymentWebhookSchema } from "@/modules/webstore/webstore.validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(paymentWebhookSchema, body);

    if (input.provider.toUpperCase() !== "MOCK") {
      return jsonOk(
        {
          data: {
            ignored: true,
            reason: "Provider not supported in this sprint.",
          },
        },
        202,
      );
    }

    const data = await recordPaymentEvent({
      provider: input.provider.toUpperCase(),
      providerRef: input.providerRef,
      orderNumber: input.orderNumber,
      amount: input.amount,
      rawPayload: input.payload ?? body,
      newStatus: input.status,
    });

    return jsonOk({ data }, 200);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

