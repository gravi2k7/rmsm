import { AggregateRoot, Guard } from "@rmsm/core";
import { SymbolCode } from "../value-objects/symbol-code";
import { Price } from "../value-objects/price";
import { Volume } from "../value-objects/volume";
import { Timeframe } from "../enums/timeframe.enum";
import { InvalidCandleError } from "../errors/market.errors";
import { CandleOpenedEvent } from "../events/candle-opened.event";
import { CandleClosedEvent } from "../events/candle-closed.event";

export interface CandleProps {
  readonly symbolCode: SymbolCode;
  readonly timeframe: Timeframe;
  readonly timestamp: Date;
  open: Price;
  high: Price;
  low: Price;
  close: Price;
  volume: Volume;
  isComplete: boolean;
}

/**
 * An OHLCV bar. Aggregate root: opening a new candle and completing one
 * are real events (`CandleOpenedEvent`/`CandleClosedEvent`) a subscriber
 * (e.g. an indicator engine waiting for a bar to finalize before
 * recomputing) genuinely needs to react to.
 *
 * `updateWithTick()` is how a forming candle absorbs each new tick —
 * `high`/`low`/`close`/`volume` all update; `open` never changes after
 * `open()` first creates the candle, matching the real OHLC definition
 * (the *first* price in the interval, not a rolling value).
 */
export class Candle extends AggregateRoot<string> {
  private props: CandleProps;

  private constructor(id: string, props: CandleProps) {
    super(id);
    this.props = props;
  }

  /** Opens a new, incomplete candle at `openPrice` — raises
   * `CandleOpenedEvent`. */
  static open(id: string, symbolCode: SymbolCode, timeframe: Timeframe, timestamp: Date, openPrice: Price, occurredAt: Date = new Date()): Candle {
    Guard.againstEmptyString(id, "id");
    const candle = new Candle(id, {
      symbolCode,
      timeframe,
      timestamp,
      open: openPrice,
      high: openPrice,
      low: openPrice,
      close: openPrice,
      volume: Volume.zero(),
      isComplete: false,
    });
    candle.addDomainEvent(new CandleOpenedEvent(id, symbolCode.value, timeframe, occurredAt));
    return candle;
  }

  /**
   * Reconstitutes a candle from already-known OHLCV values — e.g. loaded
   * from storage, or imported from a historical-data file — rather than
   * built live from a tick stream. Distinct from `open()`: this sets
   * `high`/`low`/`close` to *exactly* the given values, with no max/min
   * clamping against one another, so a caller that wants to validate
   * externally-sourced data (via `complete()`'s own OHLC check
   * immediately afterward) actually gets a real validation instead of
   * `updateWithTick()`'s clamping silently "correcting" bad input into
   * something valid. Raises no `CandleOpenedEvent` — reconstituting
   * existing history isn't a live candle actually opening.
   */
  static hydrate(
    id: string,
    symbolCode: SymbolCode,
    timeframe: Timeframe,
    timestamp: Date,
    open: Price,
    high: Price,
    low: Price,
    close: Price,
    volume: Volume,
  ): Candle {
    Guard.againstEmptyString(id, "id");
    return new Candle(id, { symbolCode, timeframe, timestamp, open, high, low, close, volume, isComplete: false });
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get timeframe(): Timeframe {
    return this.props.timeframe;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get open(): Price {
    return this.props.open;
  }

  get high(): Price {
    return this.props.high;
  }

  get low(): Price {
    return this.props.low;
  }

  get close(): Price {
    return this.props.close;
  }

  get volume(): Volume {
    return this.props.volume;
  }

  get isComplete(): boolean {
    return this.props.isComplete;
  }

  /** Absorbs a new tick into this still-forming candle: extends
   * `high`/`low` if the tick's price is a new extreme, updates `close`
   * to the tick's price, and accumulates `volume`. No-op (throws) if the
   * candle has already been completed — a completed candle is
   * immutable history, not something a late tick should silently mutate. */
  updateWithTick(price: Price, tickVolume: Volume): void {
    if (this.props.isComplete) {
      throw new InvalidCandleError("cannot update a completed candle with a new tick.");
    }
    this.props = {
      ...this.props,
      high: price.isGreaterThan(this.props.high) ? price : this.props.high,
      low: price.isLessThan(this.props.low) ? price : this.props.low,
      close: price,
      volume: this.props.volume.add(tickVolume),
    };
  }

  /** Marks the candle complete — validates the OHLC invariant (high is
   * the max of all four, low is the min) before doing so, and raises
   * `CandleClosedEvent`. */
  complete(occurredAt: Date = new Date()): void {
    if (this.props.isComplete) return;
    this.validateOhlc();
    this.props = { ...this.props, isComplete: true };
    this.addDomainEvent(new CandleClosedEvent(this.id, this.props.symbolCode.value, this.props.timeframe, occurredAt));
  }

  private validateOhlc(): void {
    const { open, high, low, close } = this.props;
    const maxOfOthers = Math.max(open.amount, close.amount);
    const minOfOthers = Math.min(open.amount, close.amount);
    if (high.amount < maxOfOthers) {
      throw new InvalidCandleError(`high (${high.amount}) must be >= max(open, close) (${maxOfOthers}).`);
    }
    if (low.amount > minOfOthers) {
      throw new InvalidCandleError(`low (${low.amount}) must be <= min(open, close) (${minOfOthers}).`);
    }
    if (high.amount < low.amount) {
      throw new InvalidCandleError(`high (${high.amount}) must be >= low (${low.amount}).`);
    }
  }
}
