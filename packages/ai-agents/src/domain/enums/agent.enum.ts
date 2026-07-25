export enum AgentStatus {
  IDLE = "idle",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export const AGENT_STATUSES = Object.values(AgentStatus) as readonly AgentStatus[];

/** How a run of `AgentRuntime` was invoked — the spec's "Synchronous /
 * Asynchronous / Streaming / Long-running execution" support matrix. */
export enum AgentExecutionMode {
  SYNC = "sync",
  ASYNC = "async",
  STREAMING = "streaming",
}

export const AGENT_EXECUTION_MODES = Object.values(AgentExecutionMode) as readonly AgentExecutionMode[];
