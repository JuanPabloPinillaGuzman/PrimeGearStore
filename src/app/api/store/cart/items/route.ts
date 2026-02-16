import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { addItemToCart } from "@/modules/webstore/service";
import { addCartItemSchema } from "@/modules/webstore/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(addCartItemSchema, body);
    const data = await addItemToCart(input);

    return jsonOk({ data }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
