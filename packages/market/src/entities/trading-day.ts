import { Entity, Guard } from "@rmsm/core";

export interface TradingDayProps {
  readonly exchangeId: string;
  readonly date: Date;
  readonly isTradingDay: boolean;
  /** Populated when `isTradingDay` is `false` and the reason is a
   * holiday, not a weekend — `undefined` for a plain weekend non-trading
   * day (no holiday name applies) or for an actual trading day. */
  readonly holidayName?: string;
}

/** One calendar date's resolved trading status for a specific exchange —
 * the output of `CalendarService`'s own weekend + holiday resolution,
 * not raw input data. Distinct from `MarketHoliday` (which represents
 * just the holiday definition) and `Exchange.weekendDays` (which
 * represents the recurring rule) — `TradingDay` is the answer, for one
 * concrete date, after combining both. */
export class TradingDay extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: TradingDayProps,
  ) {
    super(id);
  }

  static create(id: string, props: TradingDayProps): TradingDay {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.exchangeId, "exchangeId");
    return new TradingDay(id, props);
  }

  get exchangeId(): string {
    return this.props.exchangeId;
  }

  get date(): Date {
    return this.props.date;
  }

  get isTradingDay(): boolean {
    return this.props.isTradingDay;
  }

  get holidayName(): string | undefined {
    return this.props.holidayName;
  }
}
