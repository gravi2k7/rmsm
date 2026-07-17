import type { RuleGroup } from "../entities/rule-group.entity";
import type { ConditionEvaluationResult } from "./condition-engine.interface";

/**
 * Resolves a `RuleGroup` tree (recursively combining child
 * `Rule`s/`RuleGroup`s under AND/OR/NOT) to one real true/false
 * outcome — the composite-pattern evaluator this recursive entity
 * structure (`rule-group.entity.ts`) exists to support. A real
 * implementation (future milestone) walks the tree, calling
 * `ConditionEngine.evaluate()` for every leaf `Condition` it reaches
 * (a disabled `Rule`, per that entity's own `enabled` flag, is
 * excluded from evaluation entirely — the same "this rule doesn't
 * currently participate" semantics an author would expect from
 * toggling it off).
 */
export interface RuleGroupEvaluationResult {
  ruleGroupId: string;
  satisfied: boolean;
  childResults: (ConditionEvaluationResult | RuleGroupEvaluationResult)[];
}

export interface RuleEngine {
  evaluate(ruleGroup: RuleGroup, instrumentId: string, asOf: Date): Promise<RuleGroupEvaluationResult>;
}
