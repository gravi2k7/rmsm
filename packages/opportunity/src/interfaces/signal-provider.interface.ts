import type { SymbolCode } from "@rmsm/market";
import type { Signal } from "../entities/signal";

/**
 * The port to whatever actually generates signals — a strategy engine
 * evaluating rules against live market data, entirely outside this
 * package. This domain represents and scores signals once generated; it
 * never generates one itself.
 */
export interface SignalProvider {
  generateSignal(symbolCode: SymbolCode): Promise<Signal | null>;
}
