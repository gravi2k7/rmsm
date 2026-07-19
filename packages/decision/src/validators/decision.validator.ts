import { ok, err, type Result } from "@rmsm/core";
import type { Decision } from "../entities/decision";
import { InvalidDecisionError } from "../errors/decision.errors";

/** A decision can only be approved if its own risk assessment actually
 * passed — the one rule `DecisionService.approve()` enforces before ever
 * calling `Decision.approve()`, so an aggregate-level bug can't silently
 * approve a failing risk assessment. */
export function validateRiskAssessmentPassed(decision: Decision): Result<true, InvalidDecisionError> {
  if (!decision.riskAssessment.passed()) {
    return err(new InvalidDecisionError(`risk assessment failed: ${decision.riskAssessment.failedCheckNames().join(", ")}.`));
  }
  return ok(true);
}

/** A position size's own risk fraction must not exceed the fraction
 * implied by the risk assessment's own acceptable threshold — a
 * cross-check between two entities neither can validate purely on its
 * own. */
export function validatePositionSizeWithinRisk(decision: Decision, maxRiskFraction: number): Result<true, InvalidDecisionError> {
  if (decision.positionSize.riskFraction > maxRiskFraction) {
    return err(
      new InvalidDecisionError(
        `position size risks ${(decision.positionSize.riskFraction * 100).toFixed(2)}% of equity, exceeding the ${(maxRiskFraction * 100).toFixed(2)}% limit.`,
      ),
    );
  }
  return ok(true);
}
