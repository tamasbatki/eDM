import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("yahoo-finance2", () => ({
  default: {
    chart: vi.fn(),
    suppressNotices: vi.fn(),
  },
}));

import yahooFinance from "yahoo-finance2";
import {
  YahooFinanceProvider,
  yahooProviderInternals,
} from "@/server/finance/providers/yahoo-finance.provider";

const chartMock = vi.mocked(yahooFinance.chart);

describe("YahooFinanceProvider", () => {
  beforeEach(() => {
    chartMock.mockReset();
    yahooProviderInternals.clearHistoricalCache();
  });

  it("maps chart quotes to sorted candles", async () => {
    chartMock.mockResolvedValue({
      quotes: [
        { date: new Date("2024-01-02"), open: 10, high: 11, low: 9, close: 10.5, volume: 100 },
        { date: new Date("2024-01-01"), open: 9, high: 10, low: 8, close: 9.5, volume: 80 },
      ],
    } as any);

    const provider = new YahooFinanceProvider();
    const candles = await provider.getHistoricalPrices({ symbol: "aapl", range: "1M" });

    expect(candles).toHaveLength(2);
    expect(candles[0].timestamp.toISOString()).toContain("2024-01-01");
    expect(candles[1].close).toBe(10.5);
  });

  it("throws symbol not found when upstream says no data", async () => {
    chartMock.mockRejectedValue(new Error("No data found, symbol may be delisted"));

    const provider = new YahooFinanceProvider();
    await expect(provider.getHistoricalPrices({ symbol: "BAD", range: "1M" })).rejects.toMatchObject({
      code: "SYMBOL_NOT_FOUND",
      status: 404,
    });
  });

  it("maps too many requests to rate-limit response", async () => {
    chartMock.mockRejectedValue(new Error("Unexpected token 'T', \"Too Many Requests\" is not valid JSON"));

    const provider = new YahooFinanceProvider();
    await expect(provider.getHistoricalPrices({ symbol: "MSFT", range: "1M" })).rejects.toMatchObject({
      code: "UPSTREAM_FAILURE",
      status: 429,
    });

    expect(yahooProviderInternals.isRateLimitedMessage("too many requests")).toBe(true);
  });

  it("throws empty history when no valid candles returned", async () => {
    chartMock.mockResolvedValue({ quotes: [] } as any);

    const provider = new YahooFinanceProvider();
    await expect(provider.getHistoricalPrices({ symbol: "AAPL", range: "1M" })).rejects.toMatchObject({
      code: "EMPTY_HISTORY",
      status: 404,
    });
  });
});
