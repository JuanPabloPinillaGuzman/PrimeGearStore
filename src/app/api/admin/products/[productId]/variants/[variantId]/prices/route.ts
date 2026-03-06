import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import {
  createProductVariantPrice,
  listProductVariantPrices,
} from "@/modules/variants/variants.service";
import {
  createVariantPriceSchema,
  productVariantParamsSchema,
} from "@/modules/variants/variants.validators";

type Params = {
  params: Promise<{
    productId: string;
    variantId: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(productVariantParamsSchema, await params);
    const data = await listProductVariantPrices(routeParams.productId, routeParams.variantId);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(productVariantParamsSchema, await params);
    const body = parseOrThrow(createVariantPriceSchema, await request.json());
    const data = await createProductVariantPrice({
      productId: routeParams.productId,
      variantId: routeParams.variantId,
      priceListId: body.priceListId,
      salePrice: body.salePrice,
      currency: body.currency,
      validFrom: body.validFrom,
      validTo: body.validTo,
    });
    return jsonOk({ data }, 201, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

