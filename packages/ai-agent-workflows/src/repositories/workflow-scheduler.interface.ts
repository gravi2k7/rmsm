import type { WorkflowDefinition } from "@rmsm/ai-workflows";

/**
 * The "scheduling abstraction" capability — deliberately abstraction
 * only, ZERO implementations, exactly like `@rmsm/ai-tools`'
 * `McpToolSource` and `@rmsm/ai-memory`'s `VectorStoreProvider`. A
 * future cron/interval-backed scheduler (or a queue-backed one) can
 * implement this without any change to `AgentWorkflowRunner`, which
 * never depends on it directly — only a caller wiring a real scheduler
 * to `AgentWorkflowRunner.runAsync` would.
 */
export interface WorkflowScheduler {
  schedule(definition: WorkflowDefinition, input: unknown, whenDescription: string): Promise<string>;
  cancelSchedule(scheduleId: string): Promise<void>;
}
