import { z } from "zod";

import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { resetPasswordWithToken } from "@/modules/auth/auth.service";

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "Contraseña demasiado larga"),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await resetPasswordWithToken(body.token, body.password);
    return jsonOk({ message: "Contraseña actualizada correctamente." }, 200, request);
  } catch (err) {
    return handleRouteError(err, request);
  }
}
