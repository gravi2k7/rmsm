import { DomainError } from "@rmsm/core";

export class AgentNotFoundError extends DomainError {
  constructor(agentId: string) {
    super(`Agent "${agentId}" was not found.`, "AGENT_NOT_FOUND");
  }
}

export class InvalidAgentConfigError extends DomainError {
  constructor(reason: string) {
    super(`Invalid agent configuration: ${reason}`, "INVALID_AGENT_CONFIG");
  }
}

export class ReasoningStrategyNotFoundError extends DomainError {
  constructor(name: string) {
    super(`No reasoning strategy is registered under "${name}".`, "REASONING_STRATEGY_NOT_FOUND");
  }
}

export class AgentExecutionError extends DomainError {
  constructor(agentId: string, reason: string) {
    super(`Agent "${agentId}" execution failed: ${reason}`, "AGENT_EXECUTION_FAILED");
  }
}

export class MaxStepsExceededError extends DomainError {
  constructor(agentId: string, maxSteps: number) {
    super(`Agent "${agentId}" exceeded its maximum of ${maxSteps} steps without reaching a final answer.`, "MAX_STEPS_EXCEEDED");
  }
}

export class ExecutionNotFoundError extends DomainError {
  constructor(executionId: string) {
    super(`Agent execution "${executionId}" was not found.`, "EXECUTION_NOT_FOUND");
  }
}
