import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { updateAdminCouponByCode } from "@/modules/coupons/service";
import {
  adminCouponCodeParamsSchema,
  updateCouponSchema,
} from "@/modules/coupons/validators";

type Params = {
  params: Promise<{
    code: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(adminCouponCodeParamsSchema, await params);
    const body = parseOrThrow(updateCouponSchema, await request.json());
    const data = await updateAdminCouponByCode(routeParams.code, body);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

