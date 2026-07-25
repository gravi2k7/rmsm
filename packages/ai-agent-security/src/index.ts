// AI-409: Agent Security — permissions, policies, execution sandbox,
// role-based access, audit integration, secrets abstraction, and rate
// limiting hooks. RoleService.listPermissions() is the reuse seam into
// AI-402's unmodified StaticPermissionChecker/ToolExecutionService (see
// the collaboration test).

export { PolicyEffect, POLICY_EFFECTS } from "./domain/enums/security.enum";

export type { Role } from "./domain/entities/role.entity";
export type { Policy } from "./domain/entities/policy.entity";
export type { AuditEntry } from "./domain/entities/audit-entry.entity";
export type { AuthorizationDecision } from "./domain/entities/authorization-decision.entity";
export type { RateLimitResult } from "./domain/entities/rate-limit-result.entity";

export {
  RoleNotFoundError,
  RoleAlreadyExistsError,
  SecretNotFoundError,
  RateLimitExceededError,
} from "./domain/errors/agent-security-domain.errors";

export type { RoleRepository } from "./repositories/role-repository.interface";
export type { RoleAssignmentRepository } from "./repositories/role-assignment-repository.interface";
export type { PolicyRepository } from "./repositories/policy-repository.interface";
export type { AuditRepository } from "./repositories/audit-repository.interface";
export type { SecretsProvider } from "./repositories/secrets-provider.interface";
export type { RateLimiter } from "./repositories/rate-limiter.interface";

export type {
  AgentSecurityDomainEvent,
  RoleAssignedEvent,
  AccessGrantedEvent,
  AccessDeniedEvent,
  RateLimitExceededEvent,
} from "./events/agent-security-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { RoleService } from "./application/services/role.service";
export { PolicyService } from "./application/services/policy.service";
export { AuthorizationService } from "./application/services/authorization.service";
export { ExecutionSandboxService } from "./application/services/execution-sandbox.service";
export { SecretsService } from "./application/services/secrets.service";

export { InMemoryRoleRepository } from "./infrastructure/in-memory-role.repository";
export { InMemoryRoleAssignmentRepository } from "./infrastructure/in-memory-role-assignment.repository";
export { InMemoryPolicyRepository } from "./infrastructure/in-memory-policy.repository";
export { InMemoryAuditRepository } from "./infrastructure/in-memory-audit.repository";
export { FixedWindowRateLimiter } from "./infrastructure/fixed-window-rate.limiter";
export { InMemoryEventPublisher } from "./infrastructure/in-memory-event-publisher";
