import { auth } from "@/auth";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { toggleMyWishlistItem } from "@/modules/wishlist/wishlist.service";
import { wishlistToggleSchema } from "@/modules/wishlist/wishlist.validators";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    }
    const body = await request.json();
    const input = parseOrThrow(wishlistToggleSchema, body);
    const data = await toggleMyWishlistItem(session.user, input);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

