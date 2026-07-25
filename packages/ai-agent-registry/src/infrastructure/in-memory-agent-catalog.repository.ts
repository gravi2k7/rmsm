import type { AgentCatalogRepository } from "../repositories/agent-catalog-repository.interface";
import type { AgentCatalogEntry } from "../domain/entities/agent-catalog-entry.entity";

export class InMemoryAgentCatalogRepository implements AgentCatalogRepository {
  private readonly byId = new Map<string, AgentCatalogEntry>();

  async save(entry: AgentCatalogEntry): Promise<void> {
    this.byId.set(entry.agentId, entry);
  }

  async findById(agentId: string): Promise<AgentCatalogEntry | null> {
    return this.byId.get(agentId) ?? null;
  }

  async list(): Promise<readonly AgentCatalogEntry[]> {
    return [...this.byId.values()];
  }
}
