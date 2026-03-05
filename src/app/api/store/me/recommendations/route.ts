import { auth } from "@/auth";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { getMyPersonalizedRecommendations } from "@/modules/wishlist/wishlist.service";
import { meRecommendationsQuerySchema } from "@/modules/wishlist/wishlist.validators";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    }
    const url = new URL(request.url);
    const input = parseOrThrow(meRecommendationsQuerySchema, Object.fromEntries(url.searchParams.entries()));
    const data = await getMyPersonalizedRecommendations(session.user, input.limit);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

