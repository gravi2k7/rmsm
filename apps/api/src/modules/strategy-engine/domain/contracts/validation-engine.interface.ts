import type { StrategyVersion } from "../aggregates/strategy-version.aggregate";
import type { ValidationFinding } from "../entities/strategy-validation.entity";

/**
 * Produces a `StrategyValidation` entity's own real findings —
 * item "Validation Engine," made concrete. A real implementation
 * (future milestone) checks structural invariants a `StrategyVersion`
 * alone can't enforce through its own constructor/methods (an empty
 * rule tree — item, `EmptyRuleGroupError` exists in the domain error
 * hierarchy specifically for this; a `Condition` referencing an
 * `IndicatorOperand` whose `indicatorIdentifier` isn't actually
 * registered in AI-102 — a real, valuable cross-module check this
 * engine is the correct place for, not something either aggregate's
 * own constructor could check without a live AI-102 dependency, which
 * a pure domain entity must never have).
 */
export interface ValidationEngine {
  validate(version: StrategyVersion): Promise<{ passed: boolean; findings: ValidationFinding[] }>;
}
