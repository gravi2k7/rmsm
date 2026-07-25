import type { AgentVersionRepository } from "../repositories/agent-version-repository.interface";
import type { AgentVersion } from "../domain/entities/agent-version.entity";

function key(agentId: string, version: string): string {
  return `${agentId}@${version}`;
}

export class InMemoryAgentVersionRepository implements AgentVersionRepository {
  private readonly byKey = new Map<string, AgentVersion>();

  async save(version: AgentVersion): Promise<void> {
    this.byKey.set(key(version.agentId, version.version), version);
  }

  async findByAgentAndVersion(agentId: string, version: string): Promise<AgentVersion | null> {
    return this.byKey.get(key(agentId, version)) ?? null;
  }

  async listByAgent(agentId: string): Promise<readonly AgentVersion[]> {
    return [...this.byKey.values()].filter((v) => v.agentId === agentId);
  }
}
