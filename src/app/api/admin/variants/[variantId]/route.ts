import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { updateVariantById } from "@/modules/variants/variants.service";
import { updateVariantSchema, variantIdParamsSchema } from "@/modules/variants/variants.validators";

type Params = {
  params: Promise<{
    variantId: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(variantIdParamsSchema, await params);
    const body = parseOrThrow(updateVariantSchema, await request.json());
    const data = await updateVariantById({
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

