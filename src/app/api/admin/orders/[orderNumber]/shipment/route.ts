import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { createShipmentForOrder, updateShipmentForOrderService } from "@/modules/fulfillment/shipment.service";
import { adminOrderNumberParamsSchema } from "@/modules/admin-orders/admin-orders.validators";
import { createShipmentSchema, updateShipmentSchema } from "@/modules/fulfillment/fulfillment.validators";

type Params = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const routeParams = await params;
    const { orderNumber } = parseOrThrow(adminOrderNumberParamsSchema, routeParams);
    const body = await request.json();
    const input = parseOrThrow(createShipmentSchema, body);
    const data = await createShipmentForOrder({
      orderNumber,
      carrier: input.carrier,
      service: input.service,
      trackingNumber: input.trackingNumber,
    });
    return jsonOk({ data }, 201, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const routeParams = await params;
    const { orderNumber } = parseOrThrow(adminOrderNumberParamsSchema, routeParams);
    const body = await request.json();
    const input = parseOrThrow(updateShipmentSchema, body);
    const data = await updateShipmentForOrderService({
      orderNumber,
      carrier: input.carrier,
      service: input.service,
      trackingNumber: input.trackingNumber,
      status: input.status,
    });
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
