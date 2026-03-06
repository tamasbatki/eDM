import { AppError, isAppError } from "@/lib/app-error";

import type {
  Candle,
  FinancialDataProvider,
  GetHistoricalPricesInput,
} from "../types";

export class CompositeFinanceProvider implements FinancialDataProvider {
  constructor(private readonly providers: FinancialDataProvider[]) {}

  async getHistoricalPrices(input: GetHistoricalPricesInput): Promise<Candle[]> {
    const failures: Array<{ index: number; code?: string; message: string; status?: number }> = [];

    for (let i = 0; i < this.providers.length; i += 1) {
      const provider = this.providers[i];

      try {
        return await provider.getHistoricalPrices(input);
      } catch (error) {
        if (isAppError(error)) {
          failures.push({ index: i, code: error.code, message: error.message, status: error.status });
          continue;
        }

        failures.push({
          index: i,
          message: error instanceof Error ? error.message : "Unknown provider error",
          status: 500,
        });
      }
    }

    throw new AppError(
      "UPSTREAM_FAILURE",
      "Minden adatforras hibazott. Probald ujra kesobb.",
      502,
      { failures },
    );
  }
}
