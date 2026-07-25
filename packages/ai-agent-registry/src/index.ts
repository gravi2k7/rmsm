// AI-407: Agent Registry — agent catalog, versioning, discovery,
// capabilities/configuration/lifecycle metadata. Catalogs AI-401's own
// AgentConfig; never redefines it.

export { AgentLifecycleStatus, AGENT_LIFECYCLE_STATUSES } from "./domain/enums/agent-lifecycle.enum";

export type { AgentCatalogEntry } from "./domain/entities/agent-catalog-entry.entity";
export type { AgentVersion } from "./domain/entities/agent-version.entity";

export {
  AgentAlreadyRegisteredError,
  AgentNotFoundError,
  AgentVersionNotFoundError,
  DuplicateVersionError,
  NoActiveVersionError,
} from "./domain/errors/agent-registry-domain.errors";

export type { AgentCatalogRepository } from "./repositories/agent-catalog-repository.interface";
export type { AgentVersionRepository } from "./repositories/agent-version-repository.interface";

export type {
  AgentRegistryDomainEvent,
  AgentRegisteredEvent,
  AgentVersionPublishedEvent,
  AgentVersionActivatedEvent,
  AgentVersionDeprecatedEvent,
  AgentVersionRetiredEvent,
} from "./events/agent-registry-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { AgentCatalogService } from "./application/services/agent-catalog.service";
export { AgentDiscoveryService } from "./application/services/agent-discovery.service";

export { InMemoryAgentCatalogRepository } from "./infrastructure/in-memory-agent-catalog.repository";
export { InMemoryAgentVersionRepository } from "./infrastructure/in-memory-agent-version.repository";
export { InMemoryEventPublisher } from "./infrastructure/in-memory-event-publisher";
