// @rmsm/ai-tools public API (AI-402 Tool Calling Framework)

// Domain: enums
export { ToolResultStatus, TOOL_RESULT_STATUSES } from "./domain/enums/tool.enum";

// Domain: entities
export type { ToolMetadata } from "./domain/entities/tool-metadata.entity";
export type { ToolDefinition } from "./domain/entities/tool-definition.entity";
export type { RetryPolicy } from "./domain/entities/retry-policy.entity";
export type { ToolInvocation } from "./domain/entities/tool-invocation.entity";
export type { ToolResult } from "./domain/entities/tool-result.entity";

// Domain: errors
export {
  ToolNotFoundError,
  ToolAlreadyRegisteredError,
  ToolParameterValidationError,
  ToolPermissionDeniedError,
  ToolTimeoutError,
} from "./domain/errors/tool-domain.errors";

// Ports
export type { ToolHandler } from "./repositories/tool-handler.interface";
export type { ToolRegistry } from "./repositories/tool-registry.interface";
export type { PermissionChecker } from "./repositories/permission-checker.interface";
export type { McpToolSource } from "./repositories/mcp-tool-source.interface";

// Events
export type {
  ToolInvokedEvent,
  ToolSucceededEvent,
  ToolFailedEvent,
  ToolPermissionDeniedEvent,
  ToolTimedOutEvent,
  ToolDomainEvent,
} from "./events/tool-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { ToolExecutionService, type ToolExecutionOptions } from "./application/services/tool-execution.service";
export { ToolDiscoveryService } from "./application/services/tool-discovery.service";

// Infrastructure
export { DefaultToolRegistry } from "./infrastructure/default-tool.registry";
export { StaticPermissionChecker } from "./infrastructure/static-permission.checker";
export { InMemoryEventPublisher, type ToolEventListener } from "./infrastructure/in-memory-event-publisher";
