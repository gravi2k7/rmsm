import { ok, err, type Result } from "@rmsm/core";
import { Candle } from "../entities/candle";
import { SymbolCode } from "../value-objects/symbol-code";
import { Price } from "../value-objects/price";
import { Volume } from "../value-objects/volume";
import { Timeframe } from "../enums/timeframe.enum";
import { InvalidCandleError } from "../errors/market.errors";
import type { Tick } from "../entities/tick";
import type { MarketDomainError } from "../errors/market.errors";

export interface RawOhlcvInput {
  readonly id: string;
  readonly symbolCode: string;
  readonly timeframe: Timeframe;
  readonly timestamp: Date;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly precision: number;
  readonly isComplete: boolean;
}

/**
 * Builds `Candle`s two ways: from raw OHLCV primitives (`fromOhlcv` — the
 * shape a historical-data import would hand this domain), or by folding
 * a chronological tick stream into one candle (`fromTicks` — the shape a
 * live feed produces). Both return the same `Candle` type; which one a
 * caller uses depends entirely on which shape of source data it has.
 */
export class CandleFactory {
  static fromOhlcv(input: RawOhlcvInput): Result<Candle, MarketDomainError> {
    const symbolCode = SymbolCode.create(input.symbolCode);
    if (!symbolCode.ok) return symbolCode;

    const open = Price.create(input.open, input.precision);
    if (!open.ok) return open;
    const high = Price.create(input.high, input.precision);
    if (!high.ok) return high;
    const low = Price.create(input.low, input.precision);
    if (!low.ok) return low;
    const close = Price.create(input.close, input.precision);
    if (!close.ok) return close;
    const volume = Volume.create(input.volume);
    if (!volume.ok) return volume;

    const candle = Candle.hydrate(input.id, symbolCode.value, input.timeframe, input.timestamp, open.value, high.value, low.value, close.value, volume.value);

    if (input.isComplete) {
      try {
        candle.complete();
      } catch (error) {
        return err(error instanceof InvalidCandleError ? error : new InvalidCandleError(String(error)));
      }
    }

    return ok(candle);
  }

  /** Aggregates a chronologically-ordered tick array into one candle for
   * `timeframe`. Requires at least one tick — an empty tick array has no
   * `open` price to seed the candle with, so there's no meaningful
   * candle to build. */
  static fromTicks(id: string, symbolCode: SymbolCode, timeframe: Timeframe, ticks: readonly Tick[]): Result<Candle, InvalidCandleError> {
    const firstTick = ticks[0];
    if (!firstTick) {
      return err(new InvalidCandleError("cannot build a candle from an empty tick array."));
    }

    const candle = Candle.open(id, symbolCode, timeframe, firstTick.timestamp, firstTick.bid);
    for (const tick of ticks.slice(1)) {
      candle.updateWithTick(tick.bid, tick.volume);
    }
    return ok(candle);
  }
}
