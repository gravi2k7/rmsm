import type { SymbolCode, Timeframe } from "@rmsm/market";
import type { IndicatorReading } from "../domain/entities/indicator-reading.entity";

/** The seam to a real indicator engine (e.g. `apps/api`'s
 * `indicator-engine` module) — this package never computes named
 * indicators (RSI, MACD, ATR, ...) itself, only consumes readings
 * through this port. No implementation ships in this package by
 * design; a caller wires a real adapter over the actual engine. */
export interface IndicatorProvider {
  getReadings(symbolCode: SymbolCode, timeframe: Timeframe): Promise<readonly IndicatorReading[]>;
}
