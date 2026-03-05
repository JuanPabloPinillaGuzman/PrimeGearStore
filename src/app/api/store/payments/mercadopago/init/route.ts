import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { initMercadoPagoPreference } from "@/modules/webstore/mercadopago.service";
import { mercadoPagoInitSchema } from "@/modules/webstore/webstore.validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(mercadoPagoInitSchema, body);
    const data = await initMercadoPagoPreference(input);
    return jsonOk({ data }, 201, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
