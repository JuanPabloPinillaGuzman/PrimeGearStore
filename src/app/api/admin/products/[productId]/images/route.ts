import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import {
  createAdminProductImage,
  listAdminProductImages,
} from "@/modules/product-images/service";
import {
  createProductImageSchema,
  productIdParamsSchema,
} from "@/modules/product-images/validators";

type Params = {
  params: Promise<{ productId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const routeParams = await params;
    const parsed = parseOrThrow(productIdParamsSchema, routeParams);
    const data = await listAdminProductImages(parsed.productId);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const routeParams = await params;
    const parsedParams = parseOrThrow(productIdParamsSchema, routeParams);
    const body = await request.json();
    const input = parseOrThrow(createProductImageSchema, body);
    const data = await createAdminProductImage(parsedParams.productId, input);
    return jsonOk({ data }, 201, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
