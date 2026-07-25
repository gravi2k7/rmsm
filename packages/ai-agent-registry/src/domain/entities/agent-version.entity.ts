import type { AgentConfig } from "@rmsm/ai-agents";
import type { AgentLifecycleStatus } from "../enums/agent-lifecycle.enum";

/**
 * The "agent versioning" capability's unit of record: one published,
 * immutable snapshot of an agent's configuration. `config` is AI-401's
 * own `AgentConfig` verbatim — this package never redefines what an
 * agent's runtime configuration looks like, only catalogs it.
 * `capabilities` is the "capabilities metadata" the catalog exists to
 * make discoverable; `configurationMetadata` is free-form "operational"
 * metadata about the config (owner, cost tier, model family, ...) that
 * doesn't belong on `AgentConfig` itself.
 */
export interface AgentVersion {
  readonly agentId: string;
  readonly version: string;
  readonly config: AgentConfig;
  readonly capabilities: readonly string[];
  readonly configurationMetadata: Readonly<Record<string, unknown>>;
  readonly lifecycleStatus: AgentLifecycleStatus;
  readonly createdAt: Date;
}
