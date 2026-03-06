import { z } from "zod";

import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { resendVerificationEmail } from "@/modules/auth/auth.service";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await resendVerificationEmail(body.email);
    return jsonOk({ message: "Si el correo existe y no está verificado, recibirás un nuevo enlace." }, 200, request);
  } catch (err) {
    return handleRouteError(err, request);
  }
}
