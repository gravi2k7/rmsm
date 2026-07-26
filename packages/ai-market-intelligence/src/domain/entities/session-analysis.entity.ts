import type { TradingSession } from "../enums/market-intelligence.enum";

export interface SessionAnalysis {
  readonly session: TradingSession;
  readonly utcHour: number;
}
