import { AggregateRoot, Guard } from "@rmsm/core";
import type { SymbolCode } from "@rmsm/market";
import { Signal } from "./signal";
import { MarketContext } from "./market-context";
import { Confidence } from "../value-objects/confidence";
import { OpportunityCreatedEvent } from "../events/opportunity-created.event";
import { OpportunityExpiredEvent } from "../events/opportunity-expired.event";
import { InvalidOpportunityTransitionError } from "../errors/opportunity.errors";

export type OpportunityStatus = "PENDING" | "CONFIRMED" | "EXPIRED" | "REJECTED";

/** `PENDING` is the only entry point; every other status is terminal —
 * once confirmed, expired, or rejected, an opportunity's own outcome is
 * decided and doesn't change again. */
const ALLOWED_TRANSITIONS: Readonly<Record<OpportunityStatus, readonly OpportunityStatus[]>> = {
  PENDING: ["CONFIRMED", "EXPIRED", "REJECTED"],
  CONFIRMED: [],
  EXPIRED: [],
  REJECTED: [],
};

export interface OpportunityProps {
  readonly symbolCode: SymbolCode;
  readonly strategyId: string;
  readonly signal: Signal;
  readonly confidence: Confidence;
  readonly marketContext: MarketContext;
  status: OpportunityStatus;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

/**
 * A trade opportunity generated from a strategy's own signal — this
 * aggregate represents "here's something worth considering," not a
 * decision to act on it. Approval/risk-checking is `@rmsm/decision`'s
 * own, separate concern; an `Opportunity` reaching `CONFIRMED` means
 * "this opportunity is real and still valid," not "this is approved to
 * execute."
 */
export class Opportunity extends AggregateRoot<string> {
  private props: OpportunityProps;

  private constructor(id: string, props: OpportunityProps) {
    super(id);
    this.props = props;
  }

  static create(
    id: string,
    props: Omit<OpportunityProps, "status">,
    occurredAt: Date = new Date(),
  ): Opportunity {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.strategyId, "strategyId");
    Guard.ensure(props.expiresAt.getTime() > props.createdAt.getTime(), "expiresAt must be after createdAt.");

    const opportunity = new Opportunity(id, { ...props, status: "PENDING" });
    opportunity.addDomainEvent(new OpportunityCreatedEvent(id, occurredAt));
    return opportunity;
  }

  get symbolCode(): SymbolCode {
    return this.props.symbolCode;
  }

  get strategyId(): string {
    return this.props.strategyId;
  }

  get signal(): Signal {
    return this.props.signal;
  }

  get confidence(): Confidence {
    return this.props.confidence;
  }

  get marketContext(): MarketContext {
    return this.props.marketContext;
  }

  get status(): OpportunityStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  private transitionTo(next: OpportunityStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new InvalidOpportunityTransitionError(this.props.status, next);
    }
    this.props = { ...this.props, status: next };
  }

  confirm(): void {
    this.transitionTo("CONFIRMED");
  }

  reject(): void {
    this.transitionTo("REJECTED");
  }

  /** Marks the opportunity expired — raises `OpportunityExpiredEvent`.
   * Distinct from `reject()`: expiry is a passive, time-based outcome
   * ("nobody acted before `expiresAt`"), not an active decision. */
  expire(occurredAt: Date = new Date()): void {
    this.transitionTo("EXPIRED");
    this.addDomainEvent(new OpportunityExpiredEvent(this.id, occurredAt));
  }

  /** Whether this opportunity has passed its own `expiresAt`, as of
   * `asOf` (defaults to now) — a pure time check, independent of whether
   * `expire()` has actually been called yet (a caller decides when to
   * call it, e.g. from a scheduled sweep). */
  isPastExpiry(asOf: Date = new Date()): boolean {
    return asOf.getTime() >= this.props.expiresAt.getTime();
  }
}
