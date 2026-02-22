import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { applyBundleToCart } from "@/modules/webstore/service";
import { applyBundleSchema } from "@/modules/webstore/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(applyBundleSchema, body);
    const data = await applyBundleToCart({
      cartId: input.cartId,
      bundleId: String(input.bundleId),
    });
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
