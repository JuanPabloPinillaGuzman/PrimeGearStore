import { logger } from "@/lib/logger";

export function captureServerError(error: unknown, context?: Record<string, unknown>) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  // TODO(sprint-10): Wire real Sentry SDK when DSN is configured.
  logger.warn(
    {
      sentryEnabled: true,
      context,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    },
    "Sentry placeholder capture invoked.",
  );
}

