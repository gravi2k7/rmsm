import { DomainError } from "@rmsm/core";

export class AgentAlreadyRegisteredError extends DomainError {
  constructor(agentId: string) {
    super(`Agent already registered in the catalog: ${agentId}`, "AGENT_ALREADY_REGISTERED");
  }
}

export class AgentNotFoundError extends DomainError {
  constructor(agentId: string) {
    super(`Agent not found in the catalog: ${agentId}`, "AGENT_NOT_FOUND");
  }
}

export class AgentVersionNotFoundError extends DomainError {
  constructor(agentId: string, version: string) {
    super(`Version "${version}" not found for agent "${agentId}".`, "AGENT_VERSION_NOT_FOUND");
  }
}

export class DuplicateVersionError extends DomainError {
  constructor(agentId: string, version: string) {
    super(`Version "${version}" already exists for agent "${agentId}".`, "DUPLICATE_VERSION");
  }
}

export class NoActiveVersionError extends DomainError {
  constructor(agentId: string) {
    super(`Agent "${agentId}" has no active version.`, "NO_ACTIVE_VERSION");
  }
}
