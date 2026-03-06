import yahooFinance from "yahoo-finance2";

import {
  emptyHistoryError,
  symbolNotFoundError,
  upstreamFailureError,
  upstreamRateLimitError,
} from "../errors";
import type {
  Candle,
  FinancialDataProvider,
  GetHistoricalPricesInput,
  TimeRange,
} from "../types";

const RANGE_TO_INTERVAL: Record<TimeRange, "1d" | "1wk" | "1mo"> = {
  "1M": "1d",
  "3M": "1d",
  "6M": "1d",
  "1Y": "1d",
  "3Y": "1wk",
  "5Y": "1wk",
  MAX: "1mo",
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_RETRIES = 2;
const RETRY_DELAYS_MS = [500, 1200];

const historicalCache = new Map<string, { candles: Candle[]; cachedAt: number }>();

yahooFinance.suppressNotices(["ripHistorical"]);

function getPeriodStart(range: TimeRange): Date {
  const now = new Date();

  switch (range) {
    case "1M":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3M":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6M":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1Y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "3Y":
      return new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    case "5Y":
      return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    case "MAX":
      return new Date("1970-01-01T00:00:00.000Z");
  }
}

function getCacheKey(input: GetHistoricalPricesInput, symbol: string): string {
  return `${symbol}:${input.range}`;
}

function isRateLimitedMessage(message: string): boolean {
  return (
    message.includes("too many requests") ||
    message.includes("429") ||
    message.includes("unexpected token 't'")
  );
}

function mapYahooError(error: unknown, symbol: string): Error {
  if (!(error instanceof Error)) {
    return upstreamFailureError("yahoo", "Unexpected upstream error.");
  }

  const message = error.message.toLowerCase();
  if (message.includes("no data") || message.includes("not found") || message.includes("404")) {
    return symbolNotFoundError(symbol);
  }

  if (isRateLimitedMessage(message)) {
    return upstreamRateLimitError(
      "yahoo",
      "Yahoo ideiglenesen limitet alkalmazott (Too Many Requests). Probald meg ujra 1-2 perc mulva.",
    );
  }

  return upstreamFailureError("yahoo", `Yahoo provider failure: ${error.message}`);
}

function clearHistoricalCache(): void {
  historicalCache.clear();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChartWithRetry(symbol: string, range: TimeRange) {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt += 1) {
    try {
      return await yahooFinance.chart(symbol, {
        period1: getPeriodStart(range),
        interval: RANGE_TO_INTERVAL[range],
      });
    } catch (error) {
      lastError = error;

      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!isRateLimitedMessage(message) || attempt === RATE_LIMIT_RETRIES) {
        throw error;
      }

      await sleep(RETRY_DELAYS_MS[attempt] ?? 1500);
    }
  }

  throw lastError;
}

export class YahooFinanceProvider implements FinancialDataProvider {
  async getHistoricalPrices(input: GetHistoricalPricesInput): Promise<Candle[]> {
    const symbol = input.symbol.trim().toUpperCase();

    if (!symbol) {
      throw symbolNotFoundError(symbol);
    }

    const cacheKey = getCacheKey(input, symbol);
    let result;

    try {
      result = await fetchChartWithRetry(symbol, input.range);
    } catch (error) {
      const mapped = mapYahooError(error, symbol);

      if (mapped instanceof Error && "status" in mapped && (mapped as { status?: number }).status === 429) {
        const cached = historicalCache.get(cacheKey);
        if (cached && Date.now() - cached.cachedAt <= CACHE_TTL_MS) {
          return cached.candles;
        }
      }

      throw mapped;
    }

    const quotes = Array.isArray((result as { quotes?: unknown }).quotes)
      ? ((result as { quotes: Array<Record<string, unknown>> }).quotes ?? [])
      : [];

    const candles = quotes
      .filter(
        (row) =>
          row.date instanceof Date &&
          typeof row.open === "number" &&
          typeof row.high === "number" &&
          typeof row.low === "number" &&
          typeof row.close === "number",
      )
      .map((row) => ({
        timestamp: row.date as Date,
        open: row.open as number,
        high: row.high as number,
        low: row.low as number,
        close: row.close as number,
        volume: typeof row.volume === "number" ? row.volume : 0,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (!candles.length) {
      throw emptyHistoryError(symbol, input.range);
    }

    historicalCache.set(cacheKey, { candles, cachedAt: Date.now() });
    return candles;
  }
}

export const yahooProviderInternals = {
  mapYahooError,
  isRateLimitedMessage,
  clearHistoricalCache,
};
