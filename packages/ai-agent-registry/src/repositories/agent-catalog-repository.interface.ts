import type { AgentCatalogEntry } from "../domain/entities/agent-catalog-entry.entity";

export interface AgentCatalogRepository {
  save(entry: AgentCatalogEntry): Promise<void>;
  findById(agentId: string): Promise<AgentCatalogEntry | null>;
  list(): Promise<readonly AgentCatalogEntry[]>;
}
