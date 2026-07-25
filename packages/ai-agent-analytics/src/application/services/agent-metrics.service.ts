import type { IdGenerator, Clock } from "@rmsm/core";
import type { AuditService } from "@rmsm/ai-observability";
import type { AnalyticsRepository } from "../../repositories/analytics-repository.interface";
import { AgentRunOutcome } from "../../domain/enums/analytics.enum";
import type { AgentMetricsSummary } from "../../domain/entities/agent-metrics-summary.entity";
import { NegativeDurationError } from "../../domain/errors/agent-analytics-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { AgentRunRecordedEvent } from "../../events/agent-analytics-domain-events.interface";

/**
 * The "agent metrics," "success rate," "failure rate," and "execution
 * duration" capabilities. `auditService` is the "observability
 * integration" capability: when provided (AI-204's real, unmodified
 * `AuditService`), every recorded run is ALSO written there as a
 * human-readable audit entry — the same "observe without being
 * observed" direction every other cross-package adapter in this
 * codebase uses (AI-410 depends on AI-204, never the reverse).
 */
export class AgentMetricsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly auditService?: AuditService,
  ) {}

  async recordRun(agentId: string, executionId: string, outcome: AgentRunOutcome, durationMs: number): Promise<void> {
    if (durationMs < 0) {
      throw new NegativeDurationError();
    }

    await this.repository.recordAgentRun(agentId, outcome, durationMs);

    const event: AgentRunRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AgentRunRecorded",
      occurredAt: this.clock.now(),
      aggregateId: agentId,
      agentId,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }

    if (this.auditService) {
      await this.auditService.record(executionId, `AgentRun${capitalize(outcome)}`, `agent "${agentId}" run ${executionId} ${outcome.toLowerCase()} in ${durationMs}ms`);
    }
  }

  async getSummary(agentId: string): Promise<AgentMetricsSummary> {
    return this.repository.getAgentSummary(agentId);
  }
}

function capitalize(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
