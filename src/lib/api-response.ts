import { NextResponse } from "next/server";

import { toAppError } from "./app-error";

export function apiErrorResponse(error: unknown): NextResponse {
  const appError = toAppError(error);

  return NextResponse.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
    },
    { status: appError.status },
  );
}

export function apiValidationErrorResponse(message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message,
        details,
      },
    },
    { status: 400 },
  );
}
