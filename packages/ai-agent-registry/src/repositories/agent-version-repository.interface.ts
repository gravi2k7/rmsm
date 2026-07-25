import type { AgentVersion } from "../domain/entities/agent-version.entity";

export interface AgentVersionRepository {
  save(version: AgentVersion): Promise<void>;
  findByAgentAndVersion(agentId: string, version: string): Promise<AgentVersion | null>;
  listByAgent(agentId: string): Promise<readonly AgentVersion[]>;
}
