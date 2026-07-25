import type { AgentVersionRepository } from "../../repositories/agent-version-repository.interface";
import type { AgentCatalogRepository } from "../../repositories/agent-catalog-repository.interface";
import type { AgentCatalogEntry } from "../../domain/entities/agent-catalog-entry.entity";
import { AgentLifecycleStatus } from "../../domain/enums/agent-lifecycle.enum";

/** The "agent discovery" capability: find catalog entries by what
 * their currently-active version can do (`findByCapability`) or by
 * free-text match against name/description (`search`). Only `ACTIVE`
 * versions are considered eligible for capability-based discovery — a
 * `DRAFT`/`DEPRECATED`/`RETIRED` version isn't something a caller
 * should be routed to. */
export class AgentDiscoveryService {
  constructor(
    private readonly catalogRepository: AgentCatalogRepository,
    private readonly versionRepository: AgentVersionRepository,
  ) {}

  async findByCapability(capability: string): Promise<readonly AgentCatalogEntry[]> {
    const entries = await this.catalogRepository.list();
    const matches: AgentCatalogEntry[] = [];

    for (const entry of entries) {
      if (!entry.activeVersion) continue;
      const version = await this.versionRepository.findByAgentAndVersion(entry.agentId, entry.activeVersion);
      if (version && version.lifecycleStatus === AgentLifecycleStatus.ACTIVE && version.capabilities.includes(capability)) {
        matches.push(entry);
      }
    }

    return matches;
  }

  async search(query: string): Promise<readonly AgentCatalogEntry[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const entries = await this.catalogRepository.list();
    return entries.filter(
      (entry) => entry.name.toLowerCase().includes(normalized) || entry.description.toLowerCase().includes(normalized),
    );
  }
}
