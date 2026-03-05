import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { registerInventoryAdjust } from "@/modules/backoffice/backoffice.service";
import { inventoryAdjustSchema } from "@/modules/backoffice/backoffice.validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = parseOrThrow(inventoryAdjustSchema, body);
    const data = await registerInventoryAdjust(input);
    return jsonOk({ data }, 201);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

