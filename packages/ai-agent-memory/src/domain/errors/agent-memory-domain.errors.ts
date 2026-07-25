import { DomainError } from "@rmsm/core";

export class InvalidMemoryKeyError extends DomainError {
  constructor(reason: string) {
    super(`Invalid memory key: ${reason}`, "INVALID_MEMORY_KEY");
  }
}

export class InvalidAgentSessionError extends DomainError {
  constructor(reason: string) {
    super(`Invalid agent session: ${reason}`, "INVALID_AGENT_SESSION");
  }
}
