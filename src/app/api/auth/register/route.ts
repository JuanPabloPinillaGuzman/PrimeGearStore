import { z } from "zod";

import { handleRouteError, jsonOk } from "@/lib/errors/http";
import { registerStoreUser } from "@/modules/auth/auth.service";

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "Contraseña demasiado larga"),
  fullName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(180, "Nombre demasiado largo"),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    await registerStoreUser(body.email, body.password, body.fullName);
    return jsonOk({ message: "Cuenta creada. Revisa tu correo para confirmar tu dirección." }, 201, request);
  } catch (err) {
    return handleRouteError(err, request);
  }
}
