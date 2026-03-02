import { logger } from "@/lib/logger";

type SentryContext = Record<string, unknown> | undefined;

type ParsedDsn = {
  protocol: string;
  host: string;
  port: string;
  pathPrefix: string;
  projectId: string;
  publicKey: string;
};

function parseSentryDsn(dsn: string): ParsedDsn | null {
  try {
    const url = new URL(dsn);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const projectId = pathParts.pop();
    if (!projectId || !url.username) return null;
    return {
      protocol: url.protocol.replace(":", ""),
      host: url.hostname,
      port: url.port,
      pathPrefix: pathParts.length > 0 ? `/${pathParts.join("/")}` : "",
      projectId,
      publicKey: url.username,
    };
  } catch {
    return null;
  }
}

function buildEnvelope(dsn: ParsedDsn, error: unknown, context?: SentryContext) {
  const now = new Date().toISOString();
  const eventId = crypto.randomUUID().replaceAll("-", "");
  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  const stack = error instanceof Error ? error.stack : undefined;

  const header = {
    event_id: eventId,
    sent_at: now,
    dsn: `${dsn.protocol}://${dsn.publicKey}@${dsn.host}${dsn.port ? `:${dsn.port}` : ""}${dsn.pathPrefix}/${dsn.projectId}`,
  };

  const itemHeader = { type: "event" };
  const payload = {
    event_id: eventId,
    timestamp: now,
    level: "error",
    platform: "javascript",
    environment: process.env.NODE_ENV ?? "development",
    server_name: "primegearstore",
    message,
    tags: {
      service: "primegearstore-api",
    },
    extra: context ?? {},
    exception: {
      values: [
        {
          type: error instanceof Error ? error.name : "Error",
          value: message,
          stacktrace: stack
            ? {
                frames: stack
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => ({ filename: line })),
              }
            : undefined,
        },
      ],
    },
  };

  return `${JSON.stringify(header)}\n${JSON.stringify(itemHeader)}\n${JSON.stringify(payload)}`;
}

async function sendSentryEnvelope(error: unknown, context?: SentryContext) {
  const dsnRaw = process.env.SENTRY_DSN;
  if (!dsnRaw) return false;
  const dsn = parseSentryDsn(dsnRaw);
  if (!dsn) {
    logger.warn("Invalid SENTRY_DSN configured; skipping capture.");
    return false;
  }

  const endpoint = `${dsn.protocol}://${dsn.host}${dsn.port ? `:${dsn.port}` : ""}${dsn.pathPrefix}/api/${dsn.projectId}/envelope/`;
  const envelope = buildEnvelope(dsn, error, context);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body: envelope,
    cache: "no-store",
  });
  return response.ok;
}

export async function captureServerError(error: unknown, context?: Record<string, unknown>) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const sent = await sendSentryEnvelope(error, context);
    if (!sent) {
      logger.warn(
        {
          sentryEnabled: true,
          context,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
        "Sentry capture failed.",
      );
    }
  } catch (captureError) {
    logger.warn(
      {
        sentryEnabled: true,
        captureError: captureError instanceof Error ? captureError.message : "Unknown capture error",
        context,
      },
      "Sentry capture threw an error.",
    );
  }
}

