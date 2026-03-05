import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getAdminCouponRedemptions } from "@/modules/coupons/coupons.service";
import { adminCouponCodeParamsSchema } from "@/modules/coupons/coupons.validators";

type Params = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(adminCouponCodeParamsSchema, await params);
    const data = await getAdminCouponRedemptions(routeParams.code);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

