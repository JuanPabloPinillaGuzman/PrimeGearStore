import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { createPurchase } from "@/modules/backoffice/backoffice.service";
import { createPurchaseSchema } from "@/modules/backoffice/backoffice.validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(createPurchaseSchema, body);
    const data = await createPurchase(input);
    return jsonOk({ data }, 201);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

