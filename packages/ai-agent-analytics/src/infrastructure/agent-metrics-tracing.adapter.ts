import type { EventPublisher, AgentDomainEvent } from "@rmsm/ai-agents";
import { AgentMetricsService } from "../application/services/agent-metrics.service";
import { AgentRunOutcome } from "../domain/enums/analytics.enum";

/**
 * The concrete seam that lets AI-410 observe AI-401 without AI-401
 * knowing AI-410 exists — implements `@rmsm/ai-agents`' own
 * `EventPublisher` port, exactly the way AI-204's
 * `MemoryEventTracingAdapter` observes `@rmsm/ai-memory`. Hand an
 * instance of this to `AgentRuntime` (as its `eventPublisher`) and
 * every `AgentDomainEvent` it raises gets turned into an
 * `AgentMetricsService.recordRun` call the moment a run reaches a
 * terminal state — the dependency arrow points ai-agent-analytics ->
 * ai-agents, never back.
 *
 * Tracks each in-flight execution's start time in memory (keyed by
 * `executionId`) between `AgentStarted` and its terminal event, so
 * `durationMs` reflects AI-401's own event timestamps rather than this
 * adapter's wall-clock — accurate even if events are processed with
 * some delay.
 */
export class AgentMetricsTracingAdapter implements EventPublisher {
  private readonly startedAtByExecutionId = new Map<string, Date>();

  constructor(private readonly agentMetricsService: AgentMetricsService) {}

  async publish(events: readonly AgentDomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.handle(event);
    }
  }

  private async handle(event: AgentDomainEvent): Promise<void> {
    if (event.kind === "AgentStarted") {
      this.startedAtByExecutionId.set(event.executionId, event.occurredAt);
      return;
    }

    if (event.kind !== "AgentCompleted" && event.kind !== "AgentFailed" && event.kind !== "AgentCancelled") {
      return;
    }

    const startedAt = this.startedAtByExecutionId.get(event.executionId);
    this.startedAtByExecutionId.delete(event.executionId);
    const durationMs = startedAt ? event.occurredAt.getTime() - startedAt.getTime() : 0;

    const outcome =
      event.kind === "AgentCompleted" ? AgentRunOutcome.COMPLETED : event.kind === "AgentFailed" ? AgentRunOutcome.FAILED : AgentRunOutcome.CANCELLED;

    await this.agentMetricsService.recordRun(event.agentId, event.executionId, outcome, Math.max(0, durationMs));
  }
}
