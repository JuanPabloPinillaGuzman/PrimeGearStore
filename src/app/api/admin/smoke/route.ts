import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteError, jsonOk } from "@/lib/errors/http";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role ?? "CUSTOMER";
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    }
    if (!ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])) {
      throw new AppError("FORBIDDEN", 403, "Insufficient permissions.");
    }

    const rows = await prisma.$queryRaw<Array<{ ok: number }>>(Prisma.sql`SELECT 1 AS ok`);
    return jsonOk(
      {
        data: {
          ok: rows[0]?.ok === 1,
          db: "ok",
          timestamp: new Date().toISOString(),
        },
      },
      200,
      request,
    );
  } catch (error) {
    return handleRouteError(error, request);
  }
}
