import { auth } from "@/auth";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getMyOrders } from "@/modules/account/service";
import { meOrdersQuerySchema } from "@/modules/account/validators";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    }
    const url = new URL(request.url);
    const query = parseOrThrow(meOrdersQuerySchema, Object.fromEntries(url.searchParams.entries()));
    const data = await getMyOrders(session.user, query);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
