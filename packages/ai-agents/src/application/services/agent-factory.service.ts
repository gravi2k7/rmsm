import type { AgentConfig } from "../../domain/entities/agent-config.entity";
import type { AgentGoal } from "../../domain/entities/agent-goal.entity";
import type { AgentContext } from "../../domain/entities/agent-context.entity";
import { InvalidAgentConfigError } from "../../domain/errors/agent-domain.errors";
import type { AgentRegistry } from "../../repositories/agent-registry.interface";

/**
 * The "Agent factory" capability: validates an `AgentConfig` before it
 * ever reaches `AgentRegistry`/`AgentRuntime`, and builds the initial
 * `AgentContext` a run starts from. Kept separate from `AgentRuntime`
 * (which only ever runs an already-valid, already-registered agent) so
 * config validation happens once, at creation time, not on every run.
 */
export class AgentFactory {
  constructor(private readonly agentRegistry: AgentRegistry) {}

  createAgent(config: AgentConfig): AgentConfig {
    this.validate(config);
    this.agentRegistry.register(config);
    return config;
  }

  createContext(agentId: string, goals: readonly AgentGoal[], variables: Readonly<Record<string, unknown>> = {}, sessionId: string | null = null): AgentContext {
    return { agentId, sessionId, goals, variables };
  }

  private validate(config: AgentConfig): void {
    if (!config.id.trim()) {
      throw new InvalidAgentConfigError("id must not be empty");
    }
    if (!config.name.trim()) {
      throw new InvalidAgentConfigError("name must not be empty");
    }
    if (!config.reasoningStrategyName.trim()) {
      throw new InvalidAgentConfigError("reasoningStrategyName must not be empty");
    }
    if (config.maxSteps <= 0) {
      throw new InvalidAgentConfigError("maxSteps must be positive");
    }
  }
}
