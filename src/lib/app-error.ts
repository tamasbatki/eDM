export type ApiErrorCode =
  | "BAD_REQUEST"
  | "INTERNAL_ERROR"
  | "UPSTREAM_FAILURE"
  | "SYMBOL_NOT_FOUND"
  | "EMPTY_HISTORY"
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_MERGE_TAG"
  | "CONFIG_ERROR"
  | "SERVICE_DISABLED";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, status = 500, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) return new AppError("INTERNAL_ERROR", error.message, 500);
  return new AppError("INTERNAL_ERROR", "Unknown error", 500);
}
