import type { AgentRegistry } from "../repositories/agent-registry.interface";
import type { AgentConfig } from "../domain/entities/agent-config.entity";

export class DefaultAgentRegistry implements AgentRegistry {
  private readonly configs = new Map<string, AgentConfig>();

  register(config: AgentConfig): void {
    this.configs.set(config.id, config);
  }

  get(agentId: string): AgentConfig | undefined {
    return this.configs.get(agentId);
  }

  list(): readonly AgentConfig[] {
    return [...this.configs.values()];
  }
}
