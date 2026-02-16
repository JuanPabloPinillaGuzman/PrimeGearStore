import { NextResponse } from "next/server";

import { ZodError } from "zod";

import { AppError } from "@/lib/errors/app-error";

type ErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(code: string, message: string, status: number) {
  const body: ErrorBody = {
    error: {
      code,
      message,
    },
  };

  return NextResponse.json(body, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("VALIDATION_ERROR", "Request validation failed.", 400);
  }

  if (error instanceof AppError) {
    return jsonError(error.code, error.message, error.status);
  }

  return jsonError("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}
