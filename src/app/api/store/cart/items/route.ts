import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { addItemToCart, removeCartItem, updateCartItem } from "@/modules/webstore/webstore.service";
import {
  addCartItemSchema,
  removeCartItemSchema,
  updateCartItemSchema,
} from "@/modules/webstore/webstore.validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(addCartItemSchema, body);
    const data = await addItemToCart(input);

    return jsonOk({ data }, 201);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(updateCartItemSchema, body);
    const data = await updateCartItem({
      cartId: input.cartId,
      itemId: String(input.itemId),
      quantity: input.quantity,
    });
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(removeCartItemSchema, body);
    const data = await removeCartItem({
      cartId: input.cartId,
      itemId: String(input.itemId),
    });
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

