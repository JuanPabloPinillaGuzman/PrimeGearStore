import { auth } from "@/auth";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { getMyWishlist } from "@/modules/wishlist/wishlist.service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    }
    const data = await getMyWishlist(session.user);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

