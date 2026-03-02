import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getRecoverCartByToken } from "@/modules/webstore/service";
import { recoverCartQuerySchema } from "@/modules/webstore/validators";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const input = parseOrThrow(recoverCartQuerySchema, query);
    const data = await getRecoverCartByToken(input.token);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
