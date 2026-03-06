import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { auth } from "@/auth";
import { updateAdminOrderStatus } from "@/modules/admin-orders/admin-orders.service";
import {
  adminOrderNumberParamsSchema,
  updateOrderStatusSchema,
} from "@/modules/admin-orders/admin-orders.validators";

type Params = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    const routeParams = await params;
    const { orderNumber } = parseOrThrow(adminOrderNumberParamsSchema, routeParams);
    const body = await request.json();
    const input = parseOrThrow(updateOrderStatusSchema, body);
    const data = await updateAdminOrderStatus({
      orderNumber,
      status: input.status,
      adminUserId: session?.user?.id,
    });
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export const POST = PATCH;
