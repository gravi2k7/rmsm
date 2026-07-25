import type { Clock, IdGenerator } from "@rmsm/core";
import type { AgentConfig } from "@rmsm/ai-agents";
import type { AgentCatalogRepository } from "../../repositories/agent-catalog-repository.interface";
import type { AgentVersionRepository } from "../../repositories/agent-version-repository.interface";
import type { AgentCatalogEntry } from "../../domain/entities/agent-catalog-entry.entity";
import type { AgentVersion } from "../../domain/entities/agent-version.entity";
import { AgentLifecycleStatus } from "../../domain/enums/agent-lifecycle.enum";
import {
  AgentAlreadyRegisteredError,
  AgentNotFoundError,
  AgentVersionNotFoundError,
  DuplicateVersionError,
  NoActiveVersionError,
} from "../../domain/errors/agent-registry-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type {
  AgentRegisteredEvent,
  AgentVersionPublishedEvent,
  AgentVersionActivatedEvent,
  AgentVersionDeprecatedEvent,
  AgentVersionRetiredEvent,
} from "../../events/agent-registry-domain-events.interface";

/**
 * AI-407's core service: "agent catalog," "agent versioning," and
 * "lifecycle metadata" in one place. Never reimplements what an
 * `AgentConfig` is (that's AI-401's) — only catalogs, versions, and
 * tracks the lifecycle of published configs. `getActiveConfig()` is
 * the reuse seam: a caller reads the currently-active `AgentConfig`
 * from here and registers it into AI-401's own `AgentRegistry`/
 * `AgentFactory`, rather than this package trying to run agents itself.
 */
export class AgentCatalogService {
  constructor(
    private readonly catalogRepository: AgentCatalogRepository,
    private readonly versionRepository: AgentVersionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async registerAgent(agentId: string, name: string, description: string): Promise<AgentCatalogEntry> {
    const existing = await this.catalogRepository.findById(agentId);
    if (existing) {
      throw new AgentAlreadyRegisteredError(agentId);
    }

    const now = this.clock.now();
    const entry: AgentCatalogEntry = { agentId, name, description, activeVersion: null, createdAt: now, updatedAt: now };
    await this.catalogRepository.save(entry);

    const event: AgentRegisteredEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AgentRegistered",
      occurredAt: now,
      aggregateId: agentId,
      agentId,
    };
    await this.publish([event]);

    return entry;
  }

  async publishVersion(
    agentId: string,
    version: string,
    config: AgentConfig,
    capabilities: readonly string[] = [],
    configurationMetadata: Readonly<Record<string, unknown>> = {},
  ): Promise<AgentVersion> {
    await this.getEntry(agentId);

    const existingVersion = await this.versionRepository.findByAgentAndVersion(agentId, version);
    if (existingVersion) {
      throw new DuplicateVersionError(agentId, version);
    }

    const agentVersion: AgentVersion = {
      agentId,
      version,
      config,
      capabilities,
      configurationMetadata,
      lifecycleStatus: AgentLifecycleStatus.DRAFT,
      createdAt: this.clock.now(),
    };
    await this.versionRepository.save(agentVersion);

    const event: AgentVersionPublishedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AgentVersionPublished",
      occurredAt: agentVersion.createdAt,
      aggregateId: agentId,
      agentId,
      version,
    };
    await this.publish([event]);

    return agentVersion;
  }

  /** Activates one version, demoting any previously-`ACTIVE` version
   * for the same agent to `DEPRECATED` — at most one version per agent
   * is ever `ACTIVE` at a time. */
  async activateVersion(agentId: string, version: string): Promise<AgentCatalogEntry> {
    const entry = await this.getEntry(agentId);
    const target = await this.getVersion(agentId, version);

    if (entry.activeVersion && entry.activeVersion !== version) {
      const previouslyActive = await this.getVersion(agentId, entry.activeVersion);
      const deprecated: AgentVersion = { ...previouslyActive, lifecycleStatus: AgentLifecycleStatus.DEPRECATED };
      await this.versionRepository.save(deprecated);

      const deprecatedEvent: AgentVersionDeprecatedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "AgentVersionDeprecated",
        occurredAt: this.clock.now(),
        aggregateId: agentId,
        agentId,
        version: previouslyActive.version,
      };
      await this.publish([deprecatedEvent]);
    }

    const activated: AgentVersion = { ...target, lifecycleStatus: AgentLifecycleStatus.ACTIVE };
    await this.versionRepository.save(activated);

    const now = this.clock.now();
    const updatedEntry: AgentCatalogEntry = { ...entry, activeVersion: version, updatedAt: now };
    await this.catalogRepository.save(updatedEntry);

    const activatedEvent: AgentVersionActivatedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AgentVersionActivated",
      occurredAt: now,
      aggregateId: agentId,
      agentId,
      version,
    };
    await this.publish([activatedEvent]);

    return updatedEntry;
  }

  async deprecateVersion(agentId: string, version: string): Promise<AgentVersion> {
    const target = await this.getVersion(agentId, version);
    const deprecated: AgentVersion = { ...target, lifecycleStatus: AgentLifecycleStatus.DEPRECATED };
    await this.versionRepository.save(deprecated);

    const event: AgentVersionDeprecatedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AgentVersionDeprecated",
      occurredAt: this.clock.now(),
      aggregateId: agentId,
      agentId,
      version,
    };
    await this.publish([event]);

    return deprecated;
  }

  async retireVersion(agentId: string, version: string): Promise<AgentVersion> {
    const target = await this.getVersion(agentId, version);
    const retired: AgentVersion = { ...target, lifecycleStatus: AgentLifecycleStatus.RETIRED };
    await this.versionRepository.save(retired);

    const entry = await this.getEntry(agentId);
    if (entry.activeVersion === version) {
      await this.catalogRepository.save({ ...entry, activeVersion: null, updatedAt: this.clock.now() });
    }

    const event: AgentVersionRetiredEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AgentVersionRetired",
      occurredAt: this.clock.now(),
      aggregateId: agentId,
      agentId,
      version,
    };
    await this.publish([event]);

    return retired;
  }

  async getActiveConfig(agentId: string): Promise<AgentConfig> {
    const entry = await this.getEntry(agentId);
    if (!entry.activeVersion) {
      throw new NoActiveVersionError(agentId);
    }
    const version = await this.getVersion(agentId, entry.activeVersion);
    return version.config;
  }

  async getVersion(agentId: string, version: string): Promise<AgentVersion> {
    const found = await this.versionRepository.findByAgentAndVersion(agentId, version);
    if (!found) {
      throw new AgentVersionNotFoundError(agentId, version);
    }
    return found;
  }

  async listVersions(agentId: string): Promise<readonly AgentVersion[]> {
    return this.versionRepository.listByAgent(agentId);
  }

  async getEntry(agentId: string): Promise<AgentCatalogEntry> {
    const entry = await this.catalogRepository.findById(agentId);
    if (!entry) {
      throw new AgentNotFoundError(agentId);
    }
    return entry;
  }

  async listAgents(): Promise<readonly AgentCatalogEntry[]> {
    return this.catalogRepository.list();
  }

  private async publish(
    events: readonly (
      | AgentRegisteredEvent
      | AgentVersionPublishedEvent
      | AgentVersionActivatedEvent
      | AgentVersionDeprecatedEvent
      | AgentVersionRetiredEvent
    )[],
  ): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
