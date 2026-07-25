/** The "worker agents" capability: what a coordinator knows about one
 * worker without knowing anything about how it's implemented — just
 * its id and the capabilities (free-form tags) it can be delegated
 * work for. */
export interface WorkerAgentDescriptor {
  readonly agentId: string;
  readonly capabilities: readonly string[];
}
