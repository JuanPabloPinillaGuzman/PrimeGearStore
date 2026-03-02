import { auth } from "@/auth";
import { AppError } from "@/lib/errors/app-error";
import { handleRouteError, jsonOk } from "@/lib/errors/http";

function tryParseUrl(value?: string) {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
    }
    if (session.user.role !== "ADMIN") {
      throw new AppError("FORBIDDEN", 403, "Admin role required.");
    }

    const publicBaseUrl = process.env.PUBLIC_BASE_URL;
    const parsedPublicBase = tryParseUrl(publicBaseUrl);
    const databaseUrl = process.env.DATABASE_URL;
    const parsedDatabase = tryParseUrl(databaseUrl);
    const emailProvider = process.env.EMAIL_PROVIDER ?? "console";

    const data = {
      environment: {
        nodeEnv: process.env.NODE_ENV ?? "development",
        vercelEnv: process.env.VERCEL_ENV ?? "local",
      },
      publicBaseUrl: {
        configured: Boolean(publicBaseUrl),
        isValidUrl: Boolean(parsedPublicBase),
        isHttps: parsedPublicBase?.protocol === "https:",
        host: parsedPublicBase?.host ?? null,
      },
      mercadoPago: {
        hasAccessToken: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN),
        hasWebhookSecret: Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET),
      },
      email: {
        provider: emailProvider,
        hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
        hasEmailFrom: Boolean(process.env.EMAIL_FROM),
      },
      database: {
        configured: Boolean(databaseUrl),
        host: parsedDatabase?.host ?? null,
        usesPoolerHost: Boolean(parsedDatabase?.hostname?.includes("pooler.supabase.com")),
        hasPgbouncerParam: parsedDatabase?.searchParams.get("pgbouncer") === "true",
      },
      sentry: {
        hasServerDsn: Boolean(process.env.SENTRY_DSN),
        hasClientDsn: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
      },
    };

    return jsonOk({ data }, 200, request);
  } catch (error) {
    return handleRouteError(error, request);
  }
}
