import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import {
  createAdminCoupon,
  listAdminCoupons,
} from "@/modules/coupons/coupons.service";
import { createCouponSchema } from "@/modules/coupons/coupons.validators";

export async function GET(request: Request) {
  try {
    const data = await listAdminCoupons();
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const body = parseOrThrow(createCouponSchema, await request.json());
    const data = await createAdminCoupon(body);
    return jsonOk({ data }, 201, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

