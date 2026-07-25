import type { AgentConfig } from "../domain/entities/agent-config.entity";

/** The Framework's own lightweight, in-process registry of
 * `AgentConfig`s — "Agent registry interfaces". Deliberately minimal
 * (register/get/list) compared to AI-407's `AgentCatalog`, which adds
 * versioning, discovery, and rich metadata on top of this same
 * concept; AI-407 is the enterprise-facing catalog, this is the
 * runtime-facing lookup `AgentRuntime`/`AgentFactory` use directly.
 */
export interface AgentRegistry {
  register(config: AgentConfig): void;
  get(agentId: string): AgentConfig | undefined;
  list(): readonly AgentConfig[];
}
