import type { SymbolCode } from "../value-objects/symbol-code";
import type { Timeframe } from "../enums/timeframe.enum";
import type { Candle } from "../entities/candle";
import type { Quote } from "../entities/quote";
import type { Tick } from "../entities/tick";

/**
 * The port this domain depends on for live/historical market data —
 * implemented by an infrastructure adapter (a real broker/data-vendor
 * SDK integration) that lives entirely outside this package, per this
 * package's own design rules ("No broker integration. No MT5. No
 * TradingView. No infrastructure code."). This interface is the
 * dependency-inversion boundary that makes that possible: domain
 * services depend on this, never on a concrete provider.
 */
export interface MarketDataProvider {
  getQuote(symbolCode: SymbolCode): Promise<Quote>;
  getCandles(symbolCode: SymbolCode, timeframe: Timeframe, from: Date, to: Date): Promise<Candle[]>;
  /** Subscribes to a live tick stream for `symbolCode`; returns an
   * unsubscribe function. */
  subscribeToTicks(symbolCode: SymbolCode, onTick: (tick: Tick) => void): () => void;
}
