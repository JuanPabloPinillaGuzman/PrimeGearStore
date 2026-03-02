import { NextResponse } from "next/server";

import { ZodError } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/observability/sentry";
import { getRequestId } from "@/lib/request-context";

type ErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

export function jsonOk<T>(data: T, status = 200, request?: Request) {
  const requestId = getRequestId(request);
  const response = NextResponse.json(data, { status });
  response.headers.set("x-request-id", requestId);
  return response;
}

export function jsonError(code: string, message: string, status: number, request?: Request) {
  const requestId = getRequestId(request);
  const body: ErrorBody = {
    error: {
      code,
      message,
      requestId,
    },
  };

  const response = NextResponse.json(body, { status });
  response.headers.set("x-request-id", requestId);
  return response;
}

export function handleRouteError(error: unknown, request?: Request) {
  const requestId = getRequestId(request);

  if (error instanceof ZodError) {
    logger.warn(
      {
        requestId,
        issues: error.issues,
      },
      "Request validation failed.",
    );
    return jsonError("VALIDATION_ERROR", "Request validation failed.", 400, request);
  }

  if (error instanceof AppError) {
    logger.warn(
      {
        requestId,
        code: error.code,
        status: error.status,
      },
      error.message,
    );
    return jsonError(error.code, error.message, error.status, request);
  }

  logger.error(
    {
      requestId,
      error,
    },
    "Unhandled route error.",
  );
  void captureServerError(error, { requestId });
  return jsonError("INTERNAL_ERROR", "An unexpected error occurred.", 500, request);
}
