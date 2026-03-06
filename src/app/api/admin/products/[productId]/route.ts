import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { updateCatalogProductForAdmin } from "@/modules/catalog/catalog.service";
import { updateProductSchema } from "@/modules/catalog/catalog.validators";
import { productIdParamsSchema } from "@/modules/variants/variants.validators";

type Params = {
  params: Promise<{ productId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(productIdParamsSchema, await params);
    const body = parseOrThrow(updateProductSchema, await request.json());
    const data = await updateCatalogProductForAdmin(routeParams.productId, body);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
