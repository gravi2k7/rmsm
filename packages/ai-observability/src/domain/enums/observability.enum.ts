/**
 * Deliberately its own enum, not a re-export of `@rmsm/ai-prompts`'
 * `PromptType` or `@rmsm/ai-memory`'s `MemoryType` — AI-204 observes
 * both packages through events/interfaces, never through a shared
 * enum dependency, so each stays free to evolve independently.
 */
export enum AIRequestStatus {
  PENDING = "pending",
  SUCCEEDED = "succeeded",
  FAILED = "failed",
  RETRYING = "retrying",
}

export const AI_REQUEST_STATUSES = Object.values(AIRequestStatus) as readonly AIRequestStatus[];

/** Which platform capability produced a given trace/telemetry record. */
export enum TraceSource {
  PROMPT = "prompt",
  MEMORY = "memory",
  PROVIDER = "provider",
}

export const TRACE_SOURCES = Object.values(TraceSource) as readonly TraceSource[];
