import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import {
  deleteProductVariant,
  updateProductVariant,
} from "@/modules/variants/service";
import {
  productVariantParamsSchema,
  updateVariantSchema,
} from "@/modules/variants/validators";

type Params = {
  params: Promise<{
    productId: string;
    variantId: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(productVariantParamsSchema, await params);
    const body = parseOrThrow(updateVariantSchema, await request.json());
    const data = await updateProductVariant({
      productId: routeParams.productId,
      variantId: routeParams.variantId,
      sku: body.sku,
      name: body.name,
      attributes: body.attributes,
      isActive: body.isActive,
    });
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(productVariantParamsSchema, await params);
    const data = await deleteProductVariant(routeParams.productId, routeParams.variantId);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

