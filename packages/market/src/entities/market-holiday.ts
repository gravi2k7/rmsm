import { Entity, Guard } from "@rmsm/core";

export interface MarketHolidayProps {
  readonly exchangeId: string;
  readonly name: string;
  readonly date: Date;
  /** Some holidays are half-days (e.g. many US exchanges the day after
   * Thanksgiving) rather than a full closure — `isFullDayClosure: false`
   * signals `TradingCalendar`/`CalendarService` to still check
   * `Exchange.tradingHours` rather than treating the whole day as
   * non-trading. */
  readonly isFullDayClosure: boolean;
}

export class MarketHoliday extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: MarketHolidayProps,
  ) {
    super(id);
  }

  static create(id: string, props: MarketHolidayProps): MarketHoliday {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.exchangeId, "exchangeId");
    Guard.againstEmptyString(props.name, "name");
    return new MarketHoliday(id, props);
  }

  get exchangeId(): string {
    return this.props.exchangeId;
  }

  get name(): string {
    return this.props.name;
  }

  get date(): Date {
    return this.props.date;
  }

  get isFullDayClosure(): boolean {
    return this.props.isFullDayClosure;
  }

  /** Whether this holiday falls on the same calendar date as `other`
   * (compared by UTC date, not full timestamp — a holiday is a whole-day
   * concept regardless of what time its own `date` field happens to
   * store). */
  isOnDate(other: Date): boolean {
    return (
      this.props.date.getUTCFullYear() === other.getUTCFullYear() &&
      this.props.date.getUTCMonth() === other.getUTCMonth() &&
      this.props.date.getUTCDate() === other.getUTCDate()
    );
  }
}
