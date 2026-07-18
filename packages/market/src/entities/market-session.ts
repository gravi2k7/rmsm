import { AggregateRoot, Guard } from "@rmsm/core";
import type { SessionType } from "../types/session-type";
import { SessionOpenedEvent } from "../events/session-opened.event";
import { SessionClosedEvent } from "../events/session-closed.event";

export interface MarketSessionProps {
  readonly type: SessionType;
  /** UTC hour (0-23) this session opens/closes — sessions are described
   * in UTC specifically so overlap detection between sessions (which by
   * definition span different local timezones) is a single, unambiguous
   * comparison rather than repeated timezone conversion at every call
   * site. */
  readonly openHourUtc: number;
  readonly closeHourUtc: number;
  isActive: boolean;
}

/**
 * One of the four global trading sessions (Sydney, Tokyo, London, New
 * York). Aggregate root for the same reason `Exchange` is — opening and
 * closing a session are real events other parts of the system react to.
 *
 * A session whose `closeHourUtc` is less than its `openHourUtc` is
 * understood to wrap past midnight UTC (e.g. Sydney: open 21:00, close
 * 06:00) — `isActiveAt()` handles that wraparound directly rather than
 * requiring two separate session windows to represent one continuous
 * trading period.
 */
export class MarketSession extends AggregateRoot<string> {
  private props: MarketSessionProps;

  private constructor(id: string, props: MarketSessionProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: Omit<MarketSessionProps, "isActive">): MarketSession {
    Guard.againstEmptyString(id, "id");
    Guard.againstOutOfRange(props.openHourUtc, 0, 23, "openHourUtc");
    Guard.againstOutOfRange(props.closeHourUtc, 0, 23, "closeHourUtc");
    return new MarketSession(id, { ...props, isActive: false });
  }

  get type(): SessionType {
    return this.props.type;
  }

  get openHourUtc(): number {
    return this.props.openHourUtc;
  }

  get closeHourUtc(): number {
    return this.props.closeHourUtc;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  /** Whether this session is trading at the given UTC hour, accounting
   * for midnight wraparound. */
  isActiveAt(utcHour: number): boolean {
    if (this.props.openHourUtc <= this.props.closeHourUtc) {
      return utcHour >= this.props.openHourUtc && utcHour < this.props.closeHourUtc;
    }
    return utcHour >= this.props.openHourUtc || utcHour < this.props.closeHourUtc;
  }

  /** Whether this session's own trading window overlaps `other`'s at
   * all — the classic forex "London/New York overlap" case, generalized
   * to any pair. */
  overlapsWith(other: MarketSession): boolean {
    for (let hour = 0; hour < 24; hour++) {
      if (this.isActiveAt(hour) && other.isActiveAt(hour)) return true;
    }
    return false;
  }

  open(occurredAt: Date = new Date()): void {
    if (this.props.isActive) return;
    this.props = { ...this.props, isActive: true };
    this.addDomainEvent(new SessionOpenedEvent(this.id, this.props.type, occurredAt));
  }

  close(occurredAt: Date = new Date()): void {
    if (!this.props.isActive) return;
    this.props = { ...this.props, isActive: false };
    this.addDomainEvent(new SessionClosedEvent(this.id, this.props.type, occurredAt));
  }
}
