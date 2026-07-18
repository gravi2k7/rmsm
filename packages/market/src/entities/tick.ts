import { AggregateRoot, Guard } from "@rmsm/core";
import { SymbolCode } from "../value-objects/symbol-code";
import { Price } from "../value-objects/price";
import { Volume } from "../value-objects/volume";
import { TickReceivedEvent } from "../events/tick-received.event";

export interface TickProps {
  readonly symbolCode: SymbolCode;
  readonly timestamp: Date;
  readonly bid: Price;
  readonly ask: Price;
  /** The most recent traded price, if this tick carries one — a pure
   * quote update (no trade occurred) has no `last`. */
  readonly last?: Price;
  readonly volume: Volume;
}

/**
 * A single raw market data update — the smallest unit of price
 * information this domain models (a `Candle` is built *from* a stream of
 * `Tick`s, via `updateWithTick()`; a `Tick` itself is never built from
 * anything smaller). Aggregate root because receiving one is itself a
 * real event (`TickReceivedEvent`) other parts of the system (candle
 * aggregation, live quote updates) react to.
 */
export class Tick extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly props: TickProps,
  ) {
    super(id);
  }

  static receive(id: string, props: TickProps, occurredAt: Date = new Date()): Tick {
    Guard.againstEmptyString(id, "id");
    const tick = new Tick(id, props);
    tick.addDomainEvent(new TickReceivedEvent(id, props.symbolCode.value, occurredAt));
    return tick;
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get timestamp(): Date {
    return this.props.timestamp;
  }

  get bid(): Price {
    return this.props.bid;
  }

  get ask(): Price {
    return this.props.ask;
  }

  get last(): Price | undefined {
    return this.props.last;
  }

  get volume(): Volume {
    return this.props.volume;
  }
}
