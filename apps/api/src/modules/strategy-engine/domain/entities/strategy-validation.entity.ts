/** One finding from a validation run — real enough to actually act on: which rule/condition it concerns (by id, so a future UI can highlight the exact offending node in the Rule Editor), not just a free-form message. */
export interface ValidationFinding {
  severity: "ERROR" | "WARNING";
  code: string;
  message: string;
  /** The Rule/RuleGroup/Condition id this finding concerns, if it's specific to one node — undefined for a strategy-wide finding (e.g. "no exit logic defined at all"). */
  nodeId?: string;
}

/**
 * One validation RUN's own record — item "Validation Engine" and
 * "Validation Panel" (UI) both need this to be queryable/displayable
 * on its own, not just a transient pass/fail boolean, so a strategy
 * author can see WHAT was wrong and WHERE, not just THAT something
 * was wrong. A `StrategyVersion` accumulates a real history of these
 * (an author might validate, fix an issue, validate again) —
 * `StrategyValidation` is its own entity with a stable identity for
 * exactly this reason, not overwritten in place on each run.
 */
export class StrategyValidation {
  constructor(
    public readonly id: string,
    public readonly strategyVersionId: string,
    public readonly ranAt: Date,
    public readonly passed: boolean,
    public readonly findings: ValidationFinding[],
  ) {}
}
