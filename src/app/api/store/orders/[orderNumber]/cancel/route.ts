import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { cancelOrderByNumber } from "@/modules/webstore/service";
import { orderNumberParamsSchema } from "@/modules/webstore/validators";

type Params = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const routeParams = await params;
    const { orderNumber } = parseOrThrow(orderNumberParamsSchema, routeParams);
    const data = await cancelOrderByNumber({ orderNumber });
    return jsonOk({ data });
  } catch (error) {
    return handleRouteError(error, request);
  }
}
