import { Entity, Guard } from "@rmsm/core";
import { ApprovalStatus } from "../value-objects/approval-status";

export interface ApprovalProps {
  status: ApprovalStatus;
  /** Who decided — a user id for a manual decision, or a fixed sentinel
   * like `"system"` for an automated one. `undefined` while still
   * `PENDING`/`MANUAL_REVIEW`. */
  decidedBy?: string;
  decidedAt?: Date;
  comments?: string;
}

/** The approval workflow record for a `Decision` — separated from
 * `Decision` itself so "who approved this and when, with what comment"
 * has its own identity and audit trail, distinct from the decision's own
 * risk-assessment/position-size data. */
export class Approval extends Entity<string> {
  private props: ApprovalProps;

  private constructor(id: string, props: ApprovalProps) {
    super(id);
    this.props = props;
  }

  static createPending(id: string): Approval {
    Guard.againstEmptyString(id, "id");
    return new Approval(id, { status: ApprovalStatus.pending() });
  }

  get status(): ApprovalStatus {
    return this.props.status;
  }

  get decidedBy(): string | undefined {
    return this.props.decidedBy;
  }

  get decidedAt(): Date | undefined {
    return this.props.decidedAt;
  }

  get comments(): string | undefined {
    return this.props.comments;
  }

  approve(decidedBy: string, comments?: string, decidedAt: Date = new Date()): void {
    Guard.againstEmptyString(decidedBy, "decidedBy");
    this.props = { status: ApprovalStatus.approved(), decidedBy, decidedAt, comments };
  }

  reject(decidedBy: string, comments?: string, decidedAt: Date = new Date()): void {
    Guard.againstEmptyString(decidedBy, "decidedBy");
    this.props = { status: ApprovalStatus.rejected(), decidedBy, decidedAt, comments };
  }

  flagForManualReview(comments?: string): void {
    this.props = { ...this.props, status: ApprovalStatus.manualReview(), comments };
  }
}
