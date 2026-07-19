import { ValueObject } from "@rmsm/core";

export type ApprovalStatusValue = "PENDING" | "APPROVED" | "REJECTED" | "MANUAL_REVIEW";

interface ApprovalStatusProps {
  readonly value: ApprovalStatusValue;
}

/** A validated wrapper around the four approval outcomes — a value
 * object (not a bare union) so `Approval`/`Decision` share one place
 * that knows how to compare/represent a status, and so a future addition
 * like "requires additional approvers" has one obvious home to extend. */
export class ApprovalStatus extends ValueObject<ApprovalStatusProps> {
  private constructor(value: ApprovalStatusValue) {
    super({ value });
  }

  static pending(): ApprovalStatus {
    return new ApprovalStatus("PENDING");
  }

  static approved(): ApprovalStatus {
    return new ApprovalStatus("APPROVED");
  }

  static rejected(): ApprovalStatus {
    return new ApprovalStatus("REJECTED");
  }

  static manualReview(): ApprovalStatus {
    return new ApprovalStatus("MANUAL_REVIEW");
  }

  get value(): ApprovalStatusValue {
    return this.props.value;
  }

  isFinal(): boolean {
    return this.props.value === "APPROVED" || this.props.value === "REJECTED";
  }
}
