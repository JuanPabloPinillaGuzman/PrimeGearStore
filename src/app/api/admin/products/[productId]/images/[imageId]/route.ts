import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import {
  deleteAdminProductImage,
  updateAdminProductImage,
} from "@/modules/product-images/product-images.service";
import {
  productImageParamsSchema,
  updateProductImageSchema,
} from "@/modules/product-images/product-images.validators";

type Params = {
  params: Promise<{ productId: string; imageId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const routeParams = await params;
    const parsedParams = parseOrThrow(productImageParamsSchema, routeParams);
    const body = await request.json();
    const input = parseOrThrow(updateProductImageSchema, body);
    const data = await updateAdminProductImage(parsedParams.productId, parsedParams.imageId, input);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const routeParams = await params;
    const parsedParams = parseOrThrow(productImageParamsSchema, routeParams);
    const data = await deleteAdminProductImage(parsedParams.productId, parsedParams.imageId);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
