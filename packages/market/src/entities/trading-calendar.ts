import { AggregateRoot, Guard } from "@rmsm/core";
import { MarketHoliday } from "./market-holiday";
import { HolidayStartedEvent } from "../events/holiday-started.event";

export interface TradingCalendarProps {
  readonly exchangeId: string;
  readonly weekendDays: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
  holidays: MarketHoliday[];
}

/**
 * An exchange's own trading calendar: which weekdays it never trades,
 * plus every known holiday. Aggregate root because adding a holiday that
 * takes effect immediately is a real event (`HolidayStartedEvent`)
 * downstream consumers (e.g. a scheduler deciding whether to poll for
 * new candles) care about.
 *
 * Deliberately holds `weekendDays` denormalized from `Exchange` rather
 * than a live reference to it — a calendar needs to answer "is this a
 * trading day" as a pure function of its own state, without reaching
 * back into an `Exchange` aggregate to do it (keeping the two aggregates
 * independently loadable/testable, per standard DDD aggregate-boundary
 * practice).
 */
export class TradingCalendar extends AggregateRoot<string> {
  private props: TradingCalendarProps;

  private constructor(id: string, props: TradingCalendarProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, exchangeId: string, weekendDays: readonly (0 | 1 | 2 | 3 | 4 | 5 | 6)[]): TradingCalendar {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(exchangeId, "exchangeId");
    return new TradingCalendar(id, { exchangeId, weekendDays, holidays: [] });
  }

  get exchangeId(): string {
    return this.props.exchangeId;
  }

  get holidays(): readonly MarketHoliday[] {
    return this.props.holidays;
  }

  /** Registers a holiday. Raises `HolidayStartedEvent` only when the
   * holiday's own date is "now" (same UTC calendar date as `occurredAt`)
   * — registering a holiday for a future or past date is a calendar
   * *update*, not the holiday actually starting; only the former is the
   * real domain event. */
  addHoliday(holiday: MarketHoliday, occurredAt: Date = new Date()): void {
    this.props.holidays = [...this.props.holidays, holiday];
    if (holiday.isOnDate(occurredAt)) {
      this.addDomainEvent(new HolidayStartedEvent(holiday.id, this.props.exchangeId, holiday.name, occurredAt));
    }
  }

  private isWeekend(date: Date): boolean {
    return this.props.weekendDays.includes(date.getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6);
  }

  private isFullDayHoliday(date: Date): boolean {
    return this.props.holidays.some((h) => h.isFullDayClosure && h.isOnDate(date));
  }

  isTradingDay(date: Date): boolean {
    return !this.isWeekend(date) && !this.isFullDayHoliday(date);
  }

  /** The next trading day strictly after `from`, per this calendar's own
   * weekend + holiday rules. Bounded to 30 lookahead days — a calendar
   * with no trading day at all in a month would indicate a data problem
   * worth surfacing as an explicit failure rather than looping forever. */
  nextTradingDay(from: Date): Date {
    return this.walkUntilTradingDay(from, 1);
  }

  previousTradingDay(from: Date): Date {
    return this.walkUntilTradingDay(from, -1);
  }

  private walkUntilTradingDay(from: Date, direction: 1 | -1): Date {
    const maxLookahead = 30;
    let candidate = new Date(from);
    for (let i = 0; i < maxLookahead; i++) {
      candidate = new Date(candidate.getTime() + direction * 24 * 60 * 60 * 1000);
      if (this.isTradingDay(candidate)) return candidate;
    }
    throw new Error(`No trading day found within ${maxLookahead} days of ${from.toISOString()} for exchange ${this.props.exchangeId}.`);
  }
}
