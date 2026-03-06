import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getAdminOrderDetail } from "@/modules/admin-orders/admin-orders.service";
import { adminOrderNumberParamsSchema } from "@/modules/admin-orders/admin-orders.validators";

type Params = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const routeParams = await params;
    const { orderNumber } = parseOrThrow(adminOrderNumberParamsSchema, routeParams);
    const data = await getAdminOrderDetail(orderNumber);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
