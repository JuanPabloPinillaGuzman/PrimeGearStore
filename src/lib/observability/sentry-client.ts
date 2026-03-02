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

function getPublicDsn() {
  return process.env.NEXT_PUBLIC_SENTRY_DSN;
}

export async function captureClientError(error: unknown, context?: Record<string, unknown>) {
  const dsnRaw = getPublicDsn();
  if (!dsnRaw || typeof window === "undefined") return;
  const dsn = parseSentryDsn(dsnRaw);
  if (!dsn) return;

  const eventId = crypto.randomUUID().replaceAll("-", "");
  const now = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error ?? "Unknown client error");
  const endpoint = `${dsn.protocol}://${dsn.host}${dsn.port ? `:${dsn.port}` : ""}${dsn.pathPrefix}/api/${dsn.projectId}/envelope/`;
  const envelope = `${JSON.stringify({
    event_id: eventId,
    sent_at: now,
    dsn: `${dsn.protocol}://${dsn.publicKey}@${dsn.host}${dsn.port ? `:${dsn.port}` : ""}${dsn.pathPrefix}/${dsn.projectId}`,
  })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify({
    event_id: eventId,
    timestamp: now,
    level: "error",
    platform: "javascript",
    environment: process.env.NODE_ENV ?? "development",
    message,
    extra: context ?? {},
    tags: { service: "primegearstore-web" },
  })}`;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: envelope,
      keepalive: true,
    });
  } catch {
    // silent: observability should not break UX
  }
}
