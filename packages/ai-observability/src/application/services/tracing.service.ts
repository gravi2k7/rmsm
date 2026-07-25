import type { Clock, IdGenerator } from "@rmsm/core";
import type { AIRequest } from "../../domain/entities/ai-request.entity";
import type { AIResponse } from "../../domain/entities/ai-response.entity";
import type { PromptTrace } from "../../domain/entities/prompt-trace.entity";
import type { MemoryTrace } from "../../domain/entities/memory-trace.entity";
import type { ProviderTrace } from "../../domain/entities/provider-trace.entity";
import { AIRequestStatus } from "../../domain/enums/observability.enum";
import { AIRequestNotFoundError, DuplicateAIRequestError } from "../../domain/errors/observability-domain.errors";
import type { TraceRepository } from "../../tracing/trace-repository.interface";
import type { TelemetryPublisher } from "../../events/telemetry-publisher.interface";
import type {
  AIRequestStartedEvent,
  PromptRenderedEvent,
  MemoryLoadedEvent,
  ProviderCalledEvent,
  ProviderCompletedEvent,
  RequestFailedEvent,
} from "../../events/observability-domain-events.interface";

/**
 * Records and publishes the lifecycle of one end-to-end AI request:
 * start, prompt render, memory load, provider call(s), completion or
 * failure. This is the service AI-201/202/203's own event streams feed
 * into (via the adapters under `infrastructure/`) — it never imports
 * those packages directly, only the plain trace entities defined in
 * this package's own `domain/entities`.
 */
export class TracingService {
  constructor(
    private readonly traceRepository: TraceRepository,
    private readonly telemetryPublisher: TelemetryPublisher,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async startRequest(requestId: string, organizationId: string | null): Promise<AIRequest> {
    const existing = await this.traceRepository.findRequestById(requestId);
    if (existing) {
      throw new DuplicateAIRequestError(requestId);
    }

    const now = this.clock.now();
    const request: AIRequest = {
      id: requestId,
      organizationId,
      status: AIRequestStatus.PENDING,
      startedAt: now,
      completedAt: null,
    };
    await this.traceRepository.saveRequest(request);

    const event: AIRequestStartedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AIRequestStarted",
      occurredAt: now,
      aggregateId: requestId,
      requestId,
      organizationId,
    };
    await this.telemetryPublisher.publish([event]);
    return request;
  }

  async recordPromptRendered(trace: PromptTrace): Promise<void> {
    await this.traceRepository.savePromptTrace(trace);
    const event: PromptRenderedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "PromptRendered",
      occurredAt: trace.occurredAt,
      aggregateId: trace.requestId,
      requestId: trace.requestId,
      templateId: trace.templateId,
      templateVersion: trace.templateVersion,
    };
    await this.telemetryPublisher.publish([event]);
  }

  async recordMemoryLoaded(trace: MemoryTrace): Promise<void> {
    await this.traceRepository.saveMemoryTrace(trace);
    const event: MemoryLoadedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "MemoryLoaded",
      occurredAt: trace.occurredAt,
      aggregateId: trace.requestId,
      requestId: trace.requestId,
      conversationId: trace.conversationId,
      entryCount: trace.entryCount,
    };
    await this.telemetryPublisher.publish([event]);
  }

  async recordProviderCalled(trace: ProviderTrace): Promise<void> {
    await this.traceRepository.saveProviderTrace(trace);
    const event: ProviderCalledEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ProviderCalled",
      occurredAt: trace.startedAt,
      aggregateId: trace.requestId,
      requestId: trace.requestId,
      providerName: trace.providerName,
      model: trace.model,
    };
    await this.telemetryPublisher.publish([event]);
  }

  async completeRequest(requestId: string, response: AIResponse, succeeded: boolean): Promise<void> {
    const request = await this.traceRepository.findRequestById(requestId);
    if (!request) {
      throw new AIRequestNotFoundError(requestId);
    }

    const now = this.clock.now();
    const updated: AIRequest = {
      ...request,
      status: succeeded ? AIRequestStatus.SUCCEEDED : AIRequestStatus.FAILED,
      completedAt: now,
    };
    await this.traceRepository.saveRequest(updated);
    await this.traceRepository.saveResponse(response);

    const providerTraces = await this.traceRepository.findProviderTracesByRequestId(requestId);
    const events: ProviderCompletedEvent[] = providerTraces.map((trace) => ({
      eventId: this.idGenerator.generate(),
      kind: "ProviderCompleted" as const,
      occurredAt: now,
      aggregateId: requestId,
      requestId,
      providerName: trace.providerName,
      model: trace.model,
      succeeded,
      durationMs: now.getTime() - trace.startedAt.getTime(),
    }));
    if (events.length > 0) {
      await this.telemetryPublisher.publish(events);
    }
  }

  async recordFailure(requestId: string, errorMessage: string, errorCode?: string): Promise<void> {
    const request = await this.traceRepository.findRequestById(requestId);
    if (!request) {
      throw new AIRequestNotFoundError(requestId);
    }

    const now = this.clock.now();
    const updated: AIRequest = { ...request, status: AIRequestStatus.FAILED, completedAt: now };
    await this.traceRepository.saveRequest(updated);

    const event: RequestFailedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "RequestFailed",
      occurredAt: now,
      aggregateId: requestId,
      requestId,
      errorMessage,
      errorCode,
    };
    await this.telemetryPublisher.publish([event]);
  }
}
