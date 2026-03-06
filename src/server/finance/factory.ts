import { env } from "@/lib/env";

import type { FinancialDataProvider } from "./types";
import { CompositeFinanceProvider } from "./providers/composite-finance.provider";
import { StooqFinanceProvider } from "./providers/stooq-finance.provider";
import { YahooFinanceProvider } from "./providers/yahoo-finance.provider";

export type ProviderKind = "auto" | "yahoo" | "stooq";

export function createFinancialDataProvider(kind?: ProviderKind): FinancialDataProvider {
  const selected = kind ?? (env.financialProvider as ProviderKind);

  switch (selected) {
    case "stooq":
      return new StooqFinanceProvider();
    case "yahoo":
    case "auto":
    default:
      return new CompositeFinanceProvider([
        new YahooFinanceProvider(),
        new StooqFinanceProvider(),
      ]);
  }
}
