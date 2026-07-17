import type { Condition } from "../entities/condition.entity";
import type { Operand } from "../value-objects/operand.value-object";

/**
 * Resolves a single `Condition` to a real true/false outcome — the
 * genuine AI-102 integration point, made concrete as a contract this
 * milestone (Domain Model only, no implementation) doesn't yet
 * implement. A real `ConditionEngine` (a future milestone) resolves
 * every `IndicatorOperand` it encounters via AI-102's own
 * `IndicatorEngineService.execute()` (AI-102 Phase 3's single public
 * entry point) — never a repository, never a calculation AI-103
 * performs itself, per this project's own "AI-103 consumes AI-102
 * services/contracts only" rule.
 *
 * `CROSSES_ABOVE`/`CROSSES_BELOW` need the PRIOR bar's own resolved
 * values to determine whether a crossing just happened — `evaluate`'s
 * own `previousResolvedValues` parameter is where a real implementation
 * gets that, rather than each condition needing to fetch its own
 * history independently.
 */
export interface ResolvedOperandValue {
  operand: Operand;
  value: string;
}

export interface ConditionEvaluationResult {
  conditionId: string;
  satisfied: boolean;
  resolvedLeft: ResolvedOperandValue;
  resolvedRight: ResolvedOperandValue;
}

export interface ConditionEngine {
  evaluate(condition: Condition, instrumentId: string, asOf: Date, previousResolvedValues?: ConditionEvaluationResult): Promise<ConditionEvaluationResult>;
}
