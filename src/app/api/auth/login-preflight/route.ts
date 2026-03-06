import { z } from "zod";

import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { findStoreUserByEmail } from "@/modules/auth/auth.repo";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await findStoreUserByEmail(body.email.toLowerCase());

    // Only flag as needing verification when user definitely exists and is unverified.
    // For all other cases (not found, already verified) return needsVerification: false
    // so we don't leak whether an email is registered.
    const needsVerification = !!user && !user.emailVerified;

    return jsonOk({ needsVerification }, 200, request);
  } catch (err) {
    return handleRouteError(err, request);
  }
}
