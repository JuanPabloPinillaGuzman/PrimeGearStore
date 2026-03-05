import { z } from "zod";

import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { setProductFeaturedStatus } from "@/modules/catalog/catalog.service";
import { productIdParamsSchema } from "@/modules/variants/variants.validators";

type Params = {
  params: Promise<{ productId: string }>;
};

const featuredBodySchema = z.object({
  isFeatured: z.boolean(),
});

export async function PATCH(request: Request, { params }: Params) {
  try {
    const routeParams = parseOrThrow(productIdParamsSchema, await params);
    const body = parseOrThrow(featuredBodySchema, await request.json());
    const data = await setProductFeaturedStatus(routeParams.productId, body.isFeatured);
    return jsonOk({ data: { id: data.id, isFeatured: data.isFeatured } }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
