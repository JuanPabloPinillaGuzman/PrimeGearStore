import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import {
  createProductVariant,
  listProductVariants,
} from "@/modules/variants/variants.service";
import {
  createVariantSchema,
  productIdParamsSchema,
} from "@/modules/variants/variants.validators";

type Params = {
  params: Promise<{
    productId: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(productIdParamsSchema, await params);
    const data = await listProductVariants(routeParams.productId);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(productIdParamsSchema, await params);
    const body = parseOrThrow(createVariantSchema, await request.json());
    const data = await createProductVariant({
      productId: routeParams.productId,
      sku: body.sku,
      name: body.name,
      attributes: body.attributes,
      isActive: body.isActive,
    });
    return jsonOk({ data }, 201, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

