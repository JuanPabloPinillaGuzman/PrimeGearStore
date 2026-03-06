import { z } from "zod";

import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { requestPasswordReset } from "@/modules/auth/auth.service";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await requestPasswordReset(body.email);
    // Always return the same message to avoid leaking whether the email is registered
    return jsonOk(
      { message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña." },
      200,
      request,
    );
  } catch (err) {
    return handleRouteError(err, request);
  }
}
