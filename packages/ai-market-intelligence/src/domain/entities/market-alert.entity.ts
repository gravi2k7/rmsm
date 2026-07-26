import type { MarketAlertSeverity } from "../enums/market-intelligence.enum";

export interface MarketAlert {
  readonly severity: MarketAlertSeverity;
  readonly code: string;
  readonly message: string;
}
