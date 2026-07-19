import { ok, err, type Result } from "@rmsm/core";
import type { StrategyVersion } from "../entities/strategy-version";
import { validateHasEntryRule, validateUniqueRuleOrder } from "../validators/strategy.validator";
import { StrategyValidationFailedError } from "../errors/strategy.errors";

/**
 * Runs every applicable validator against a `StrategyVersion` and
 * aggregates every failure into one `StrategyValidationFailedError`,
 * rather than stopping at the first one — a strategy author fixing
 * validation errors benefits from seeing all of them at once, not
 * discovering the second problem only after fixing the first.
 */
export class StrategyValidatorService {
  validateVersion(version: StrategyVersion): Result<true, StrategyValidationFailedError> {
    const reasons: string[] = [];

    const hasEntryRule = validateHasEntryRule(version);
    if (!hasEntryRule.ok) reasons.push(hasEntryRule.error.message);

    const uniqueOrder = validateUniqueRuleOrder(version);
    if (!uniqueOrder.ok) reasons.push(uniqueOrder.error.message);

    if (reasons.length > 0) {
      return err(new StrategyValidationFailedError(reasons));
    }
    return ok(true);
  }
}
