import { describe, expect, it } from "vitest";

import {
  StooqFinanceProvider,
  stooqProviderInternals,
} from "@/server/finance/providers/stooq-finance.provider";

describe("StooqFinanceProvider internals", () => {
  it("maps plain symbol to .us suffix", () => {
    expect(stooqProviderInternals.toStooqSymbol("AAPL")).toBe("aapl.us");
  });

  it("keeps exchange suffix when provided", () => {
    expect(stooqProviderInternals.toStooqSymbol("AAPL.US")).toBe("aapl.us");
  });

  it("parses a valid csv row", () => {
    const candle = stooqProviderInternals.parseCsvRowToCandle("2024-01-02,10,11,9,10.5,100");
    expect(candle?.close).toBe(10.5);
  });

  it("returns null for invalid row", () => {
    const candle = stooqProviderInternals.parseCsvRowToCandle("bad,row");
    expect(candle).toBeNull();
  });

  it("can instantiate provider", () => {
    const provider = new StooqFinanceProvider();
    expect(provider).toBeTruthy();
  });
});
