import { createFinancialDataProvider } from "./factory";
import type { GetHistoricalPricesInput, HistoricalPoint } from "./types";

export async function getHistoricalCloseSeries(input: GetHistoricalPricesInput): Promise<HistoricalPoint[]> {
  const provider = createFinancialDataProvider();
  const candles = await provider.getHistoricalPrices(input);

  return candles.map((candle) => ({
    timestamp: candle.timestamp.toISOString(),
    close: candle.close,
  }));
}
