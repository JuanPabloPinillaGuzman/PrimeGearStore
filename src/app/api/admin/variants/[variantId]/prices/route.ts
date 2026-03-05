import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { createVariantPriceByVariantId } from "@/modules/variants/variants.service";
import { createVariantPriceSchema, variantIdParamsSchema } from "@/modules/variants/variants.validators";

type Params = {
  params: Promise<{
    variantId: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(variantIdParamsSchema, await params);
    const body = parseOrThrow(createVariantPriceSchema, await request.json());
    const data = await createVariantPriceByVariantId({
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

