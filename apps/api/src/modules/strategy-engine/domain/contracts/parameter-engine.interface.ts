import type { StrategyParameterDefinition, StrategyParameterValue } from "../value-objects/strategy-parameter.value-object";

/**
 * Resolves an `ExecutionProfile`'s own supplied parameter values
 * against a `StrategyVersion`'s own declared
 * `StrategyParameterDefinition[]` — validates required-ness and
 * type/range constraints (the same category of check AI-102's own
 * `ExecutionValidatorService.validateParameters()` performs for
 * indicator parameters, applied here to strategy parameters instead),
 * and fills in any un-supplied optional parameter's own
 * `defaultValue`. A future `Condition`'s own `IndicatorOperand.parameters`
 * or a strategy's own risk-management logic (a later milestone) reads
 * from THIS resolved, complete parameter set — never partially-filled
 * caller input directly.
 */
export interface ParameterResolutionResult {
  valid: boolean;
  errors: string[];
  resolvedParameters: Record<string, StrategyParameterValue>;
}

export interface ParameterEngine {
  resolve(definitions: StrategyParameterDefinition[], suppliedValues: Record<string, StrategyParameterValue>): ParameterResolutionResult;
}
