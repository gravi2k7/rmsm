import { AggregateRoot, Guard } from "@rmsm/core";
import { Approval } from "./approval";
import { RiskAssessment } from "./risk-assessment";
import { PositionSize } from "./position-size";
import { DecisionApprovedEvent } from "../events/decision-approved.event";
import { DecisionRejectedEvent } from "../events/decision-rejected.event";
import { InvalidDecisionTransitionError } from "../errors/decision.errors";

export type DecisionStatus = "PENDING" | "APPROVED" | "REJECTED" | "MANUAL_REVIEW";

const ALLOWED_TRANSITIONS: Readonly<Record<DecisionStatus, readonly DecisionStatus[]>> = {
  PENDING: ["APPROVED", "REJECTED", "MANUAL_REVIEW"],
  MANUAL_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
};

export interface DecisionProps {
  readonly opportunityId: string;
  readonly riskAssessment: RiskAssessment;
  readonly positionSize: PositionSize;
  readonly approval: Approval;
  status: DecisionStatus;
  readonly createdAt: Date;
}

/**
 * The go/no-go gate before execution — risk-validates a specific
 * `@rmsm/opportunity` opportunity (referenced by id, not a live
 * dependency on that package) and produces an approval outcome. This
 * aggregate owns the *workflow*: which risk assessment applies, what
 * size was calculated, who approved or rejected it and why. It does not
 * itself decide whether risk checks pass — that's `RiskAssessment`'s own
 * job, computed beforehand by `RiskService` and handed to `Decision` at
 * construction.
 */
export class Decision extends AggregateRoot<string> {
  private props: DecisionProps;

  private constructor(id: string, props: DecisionProps) {
    super(id);
    this.props = props;
  }

  static create(
    id: string,
    props: Pick<DecisionProps, "opportunityId" | "riskAssessment" | "positionSize" | "createdAt">,
  ): Decision {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.opportunityId, "opportunityId");

    return new Decision(id, {
      ...props,
      approval: Approval.createPending(`${id}-approval`),
      status: "PENDING",
    });
  }

  get opportunityId(): string {
    return this.props.opportunityId;
  }

  get riskAssessment(): RiskAssessment {
    return this.props.riskAssessment;
  }

  get positionSize(): PositionSize {
    return this.props.positionSize;
  }

  get approval(): Approval {
    return this.props.approval;
  }

  get status(): DecisionStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  private transitionTo(next: DecisionStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new InvalidDecisionTransitionError(this.props.status, next);
    }
    this.props = { ...this.props, status: next };
  }

  /** Approves the decision — records the approval and raises
   * `DecisionApprovedEvent`. Does not itself check `riskAssessment.passed()`;
   * that's `DecisionService`'s own responsibility to enforce before ever
   * calling this (an aggregate method shouldn't silently veto its own
   * caller — a caller that approves a failing risk assessment is a real
   * bug worth a loud test failure, not a quiet no-op here). */
  approve(decidedBy: string, comments?: string, occurredAt: Date = new Date()): void {
    this.transitionTo("APPROVED");
    this.props.approval.approve(decidedBy, comments, occurredAt);
    this.addDomainEvent(new DecisionApprovedEvent(this.id, occurredAt));
  }

  reject(decidedBy: string, comments?: string, occurredAt: Date = new Date()): void {
    this.transitionTo("REJECTED");
    this.props.approval.reject(decidedBy, comments, occurredAt);
    this.addDomainEvent(new DecisionRejectedEvent(this.id, occurredAt));
  }

  flagForManualReview(comments?: string): void {
    this.transitionTo("MANUAL_REVIEW");
    this.props.approval.flagForManualReview(comments);
  }
}
