import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { recordPaymentEvent } from "@/modules/webstore/payment.service";
import { mockApprovePaymentSchema } from "@/modules/webstore/webstore.validators";

function generateMockProviderRef() {
  const now = new Date();
  return `MOCK-${now.getTime()}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(mockApprovePaymentSchema, body);
    const providerRef = generateMockProviderRef();

    const data = await recordPaymentEvent({
      provider: "MOCK",
      providerRef,
      orderNumber: input.orderNumber,
      amount: input.amount,
      rawPayload: body,
      newStatus: "APPROVED",
    });

    return jsonOk({ data }, 201);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

