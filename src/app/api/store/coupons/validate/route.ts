import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { validateCouponForCart } from "@/modules/coupons/service";
import { validateCouponSchema } from "@/modules/coupons/validators";

export async function POST(request: Request) {
  try {
    const body = parseOrThrow(validateCouponSchema, await request.json());
    const data = await validateCouponForCart(body);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

