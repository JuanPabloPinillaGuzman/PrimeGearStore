import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { handleRouteError, jsonOk } from "@/lib/errors/http";

async function checkDb() {
  const timeoutMs = Number(process.env.HEALTH_DB_TIMEOUT_MS ?? 3000);
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("DB health timeout")), timeoutMs);
  });

  const query = prisma.$queryRaw<Array<{ ok: number }>>(Prisma.sql`SELECT 1 AS ok`);
  await Promise.race([query, timeout]);
}

export async function GET(request: Request) {
  try {
    await checkDb();
    return jsonOk(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        db: "ok",
      },
      200,
      request,
    );
  } catch (error) {
    return handleRouteError(error, request);
  }
}
