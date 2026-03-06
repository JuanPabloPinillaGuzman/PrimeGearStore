import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { deleteAdminCouponByCode, updateAdminCouponByCode } from "@/modules/coupons/coupons.service";
import {
  adminCouponCodeParamsSchema,
  updateCouponSchema,
} from "@/modules/coupons/coupons.validators";

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

export async function DELETE(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(adminCouponCodeParamsSchema, await params);
    const data = await deleteAdminCouponByCode(routeParams.code);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
