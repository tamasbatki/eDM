import { AppError } from "@/lib/app-error";

export function symbolNotFoundError(symbol: string): AppError {
  return new AppError("SYMBOL_NOT_FOUND", `Ticker not found: ${symbol}`, 404, { symbol });
}

export function emptyHistoryError(symbol: string, range: string): AppError {
  return new AppError("EMPTY_HISTORY", "No historical data available for the selected range", 404, {
    symbol,
    range,
  });
}

export function upstreamFailureError(provider: string, message: string): AppError {
  return new AppError("UPSTREAM_FAILURE", message, 502, { provider });
}

export function upstreamRateLimitError(provider: string, message: string): AppError {
  return new AppError("UPSTREAM_FAILURE", message, 429, { provider, reason: "rate_limit" });
}
