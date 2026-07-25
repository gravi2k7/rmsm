import { DomainError } from "@rmsm/core";

export class ToolNotFoundError extends DomainError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" is not registered.`, "TOOL_NOT_FOUND");
  }
}

export class ToolAlreadyRegisteredError extends DomainError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" is already registered.`, "TOOL_ALREADY_REGISTERED");
  }
}

export class ToolParameterValidationError extends DomainError {
  constructor(toolName: string, issues: readonly string[]) {
    super(`Parameters for tool "${toolName}" failed validation: ${issues.join("; ")}`, "TOOL_PARAMETER_VALIDATION_FAILED");
  }
}

export class ToolPermissionDeniedError extends DomainError {
  constructor(toolName: string, missingPermissions: readonly string[]) {
    super(`Tool "${toolName}" requires permissions not granted: ${missingPermissions.join(", ")}`, "TOOL_PERMISSION_DENIED");
  }
}

export class ToolTimeoutError extends DomainError {
  constructor(toolName: string, timeoutMs: number) {
    super(`Tool "${toolName}" timed out after ${timeoutMs}ms.`, "TOOL_TIMEOUT");
  }
}
