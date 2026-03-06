export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX";

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalPoint {
  timestamp: string;
  close: number;
}

export interface GetHistoricalPricesInput {
  symbol: string;
  range: TimeRange;
}

export interface FinancialDataProvider {
  getHistoricalPrices(input: GetHistoricalPricesInput): Promise<Candle[]>;
}
