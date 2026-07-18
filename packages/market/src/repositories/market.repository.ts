import type { SymbolCode } from "../value-objects/symbol-code";
import type { Timeframe } from "../enums/timeframe.enum";
import type { Candle } from "../entities/candle";
import type { Tick } from "../entities/tick";
import type { Quote } from "../entities/quote";

/**
 * Persistence port for time-series market data — `Candle`/`Tick`/`Quote`
 * storage. Interface only, per this package's own design rules ("No
 * Prisma. No database implementation. Repository interfaces only.") —
 * a real implementation (e.g. backed by Postgres/TimescaleDB via
 * `@rmsm/database`) lives entirely in an infrastructure layer outside
 * this package.
 */
export interface MarketRepository {
  saveCandle(candle: Candle): Promise<void>;
  getCandles(symbolCode: SymbolCode, timeframe: Timeframe, from: Date, to: Date): Promise<Candle[]>;
  getLatestCandle(symbolCode: SymbolCode, timeframe: Timeframe): Promise<Candle | null>;

  saveTick(tick: Tick): Promise<void>;
  getLatestTick(symbolCode: SymbolCode): Promise<Tick | null>;

  saveQuote(quote: Quote): Promise<void>;
  getLatestQuote(symbolCode: SymbolCode): Promise<Quote | null>;
}
