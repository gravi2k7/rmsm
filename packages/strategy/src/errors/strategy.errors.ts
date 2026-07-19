import { DomainError } from "@rmsm/core";

export abstract class StrategyDomainError extends DomainError {}

export class InvalidStrategyError extends StrategyDomainError {
  constructor(reason: string) {
    super(`Invalid strategy: ${reason}`, "INVALID_STRATEGY");
  }
}

export class InvalidStrategyLifecycleTransitionError extends StrategyDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Strategy cannot transition from "${fromStatus}" to "${toStatus}".`, "INVALID_LIFECYCLE_TRANSITION");
  }
}

export class InvalidParameterError extends StrategyDomainError {
  constructor(parameterName: string, reason: string) {
    super(`Invalid value for parameter "${parameterName}": ${reason}`, "INVALID_PARAMETER");
  }
}

export class InvalidRuleError extends StrategyDomainError {
  constructor(reason: string) {
    super(`Invalid strategy rule: ${reason}`, "INVALID_RULE");
  }
}

export class InvalidRiskProfileError extends StrategyDomainError {
  constructor(reason: string) {
    super(`Invalid risk profile: ${reason}`, "INVALID_RISK_PROFILE");
  }
}

export class UnknownStrategyError extends StrategyDomainError {
  constructor(strategyId: string) {
    super(`Strategy "${strategyId}" is not known.`, "UNKNOWN_STRATEGY");
  }
}

export class StrategyValidationFailedError extends StrategyDomainError {
  constructor(public readonly reasons: readonly string[]) {
    super(`Strategy failed validation: ${reasons.join("; ")}`, "STRATEGY_VALIDATION_FAILED");
  }
}
