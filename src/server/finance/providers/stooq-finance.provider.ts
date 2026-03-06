import { AppError } from "@/lib/app-error";

import type {
  Candle,
  FinancialDataProvider,
  GetHistoricalPricesInput,
  TimeRange,
} from "../types";
import { emptyHistoryError, symbolNotFoundError, upstreamFailureError } from "../errors";

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

function toStooqSymbol(symbol: string): string {
  const normalized = symbol.trim().toLowerCase();

  if (!normalized) return normalized;
  if (normalized.includes(".")) return normalized;
  if (normalized.startsWith("^")) return normalized;

  return `${normalized}.us`;
}

function parseCsvRowToCandle(row: string): Candle | null {
  const [date, open, high, low, close, volume] = row.split(",");
  if (!date || !open || !high || !low || !close) return null;

  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const parsedOpen = Number(open);
  const parsedHigh = Number(high);
  const parsedLow = Number(low);
  const parsedClose = Number(close);
  const parsedVolume = Number(volume || 0);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    Number.isNaN(parsedOpen) ||
    Number.isNaN(parsedHigh) ||
    Number.isNaN(parsedLow) ||
    Number.isNaN(parsedClose)
  ) {
    return null;
  }

  return {
    timestamp: parsedDate,
    open: parsedOpen,
    high: parsedHigh,
    low: parsedLow,
    close: parsedClose,
    volume: Number.isFinite(parsedVolume) ? parsedVolume : 0,
  };
}

export class StooqFinanceProvider implements FinancialDataProvider {
  async getHistoricalPrices(input: GetHistoricalPricesInput): Promise<Candle[]> {
    const symbol = input.symbol.trim().toUpperCase();
    if (!symbol) {
      throw symbolNotFoundError(symbol);
    }

    const stooqSymbol = toStooqSymbol(symbol);
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw upstreamFailureError("stooq", `Stooq request failed with status ${response.status}`);
    }

    const csv = await response.text();
    if (!csv || csv.toLowerCase().includes("no data")) {
      throw symbolNotFoundError(symbol);
    }

    const lines = csv.trim().split(/\r?\n/);
    const rows = lines.slice(1);
    const periodStart = getPeriodStart(input.range).getTime();

    const candles = rows
      .map(parseCsvRowToCandle)
      .filter((item): item is Candle => Boolean(item))
      .filter((candle) => candle.timestamp.getTime() >= periodStart)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (!candles.length) {
      throw emptyHistoryError(symbol, input.range);
    }

    return candles;
  }
}

export const stooqProviderInternals = {
  toStooqSymbol,
  parseCsvRowToCandle,
};
