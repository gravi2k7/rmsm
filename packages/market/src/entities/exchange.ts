import { AggregateRoot, Guard } from "@rmsm/core";
import type { ExchangeType } from "../types/exchange-type";
import { MarketOpenedEvent } from "../events/market-opened.event";
import { MarketClosedEvent } from "../events/market-closed.event";

/** A day-of-week trading window in the exchange's own local timezone
 * (`Exchange.timezone`), expressed as `"HH:mm"` 24-hour strings. */
export interface TradingHours {
  readonly dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  readonly openTime: string;
  readonly closeTime: string;
}

export interface ExchangeProps {
  readonly name: string;
  readonly country: string;
  readonly timezone: string;
  readonly type: ExchangeType;
  readonly tradingHours: readonly TradingHours[];
  /** Days of the week this exchange never trades, regardless of
   * `tradingHours` — most exchanges close Saturday/Sunday, but this is
   * configurable rather than hardcoded (per this domain's own design
   * rules: no hardcoded market-specific assumptions where a real
   * exchange might differ, e.g. some crypto-adjacent venues trade every
   * day). */
  readonly weekendDays: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
  isOpen: boolean;
}

/**
 * A trading venue. Aggregate root (not a plain `Entity`) because opening
 * and closing an exchange are real domain events other parts of the
 * system react to (`MarketOpenedEvent`/`MarketClosedEvent`) — the
 * canonical "an entity whose state transitions matter enough to notify
 * about" case `AggregateRoot` exists for.
 *
 * Holiday awareness is deliberately NOT built into `Exchange` itself —
 * that's `TradingCalendar`'s own responsibility (a holiday calendar can
 * be shared across multiple exchanges, or be exchange-specific; coupling
 * it directly into `Exchange` would prevent that reuse). `CalendarService`
 * is where "is this exchange open right now, accounting for both trading
 * hours AND holidays" actually gets answered.
 */
export class Exchange extends AggregateRoot<string> {
  private props: ExchangeProps;

  private constructor(id: string, props: ExchangeProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: Omit<ExchangeProps, "isOpen">): Exchange {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.name, "name");
    Guard.againstEmptyString(props.country, "country");
    Guard.againstEmptyString(props.timezone, "timezone");
    return new Exchange(id, { ...props, isOpen: false });
  }

  get name(): string {
    return this.props.name;
  }

  get country(): string {
    return this.props.country;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get type(): ExchangeType {
    return this.props.type;
  }

  get tradingHours(): readonly TradingHours[] {
    return this.props.tradingHours;
  }

  get weekendDays(): readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[] {
    return this.props.weekendDays;
  }

  get isOpen(): boolean {
    return this.props.isOpen;
  }

  /** Marks the exchange open and raises `MarketOpenedEvent` — a no-op
   * (no duplicate event) if it's already open, since "open an already-
   * open market" isn't a real state transition. */
  open(occurredAt: Date = new Date()): void {
    if (this.props.isOpen) return;
    this.props = { ...this.props, isOpen: true };
    this.addDomainEvent(new MarketOpenedEvent(this.id, occurredAt));
  }

  close(occurredAt: Date = new Date()): void {
    if (!this.props.isOpen) return;
    this.props = { ...this.props, isOpen: false };
    this.addDomainEvent(new MarketClosedEvent(this.id, occurredAt));
  }

  /** Whether `dayOfWeek` is one of this exchange's own configured
   * weekend days — used by `TradingCalendar`/`CalendarService`, not
   * duplicated there. */
  isWeekendDay(dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6): boolean {
    return this.props.weekendDays.includes(dayOfWeek);
  }

  /** This exchange's configured trading window for `dayOfWeek`, if any
   * (`undefined` if it doesn't trade that day at all). */
  tradingHoursFor(dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6): TradingHours | undefined {
    return this.props.tradingHours.find((h) => h.dayOfWeek === dayOfWeek);
  }
}
