import { Entity, Guard } from "@rmsm/core";
import { RiskScore } from "../value-objects/risk-score";

export interface RiskCheckResult {
  readonly passed: boolean;
  readonly message?: string;
}

export interface RiskChecks {
  readonly maxDailyLoss: RiskCheckResult;
  readonly maxPositionSize: RiskCheckResult;
  readonly exposureLimits: RiskCheckResult;
  readonly correlationCheck: RiskCheckResult;
  readonly marginCheck: RiskCheckResult;
}

export interface RiskAssessmentProps {
  readonly checks: RiskChecks;
  readonly overallScore: RiskScore;
  readonly assessedAt: Date;
}

/**
 * The full set of pre-execution risk checks for one opportunity — every
 * check named in this domain's own required feature list (Maximum Daily
 * Loss, Maximum Position Size, Exposure Limits, Correlation Check,
 * Margin Check). Real per-check pass/fail data, not just one aggregate
 * boolean, so a rejected decision can show *which* check(s) actually
 * failed rather than an opaque "no."
 */
export class RiskAssessment extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: RiskAssessmentProps,
  ) {
    super(id);
  }

  static create(id: string, props: RiskAssessmentProps): RiskAssessment {
    Guard.againstEmptyString(id, "id");
    return new RiskAssessment(id, props);
  }

  get checks(): RiskChecks {
    return this.props.checks;
  }

  get overallScore(): RiskScore {
    return this.props.overallScore;
  }

  get assessedAt(): Date {
    return this.props.assessedAt;
  }

  /** Every individual check must pass — a single failing check (even
   * with an otherwise-acceptable overall score) means this opportunity
   * doesn't clear risk. `overallScore` is a supplementary signal for
   * ranking/prioritization among already-passing opportunities, not a
   * substitute for any one check actually passing. */
  passed(): boolean {
    return Object.values(this.props.checks).every((check) => check.passed);
  }

  /** The names of every check that failed — for surfacing to an
   * approver during manual review. */
  failedCheckNames(): string[] {
    return (Object.keys(this.props.checks) as (keyof RiskChecks)[]).filter((name) => !this.props.checks[name].passed);
  }
}
