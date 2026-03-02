import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { checkoutFromCart } from "@/modules/webstore/service";
import { checkoutSchema } from "@/modules/webstore/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(checkoutSchema, body);
    const data = await checkoutFromCart(input);

    return jsonOk({ data }, 201);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

