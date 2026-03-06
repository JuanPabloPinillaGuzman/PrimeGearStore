import { auth } from "@/auth";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { parseOrThrow } from "@/lib/validators/parse";
import { mergeMyWishlist } from "@/modules/wishlist/wishlist.service";
import { wishlistMergeSchema } from "@/modules/wishlist/wishlist.validators";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    }
    const body = await request.json();
    const input = parseOrThrow(wishlistMergeSchema, body);
    const data = await mergeMyWishlist(session.user, input);
    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}

