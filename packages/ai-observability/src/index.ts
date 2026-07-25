// @rmsm/ai-observability public API
//
// Exported: domain entities/enums/errors, application services, the
// tracing/metrics repository ports, this package's own telemetry
// events + `TelemetryPublisher` port, and the concrete infrastructure
// implementations meant for direct consumption — including
// `MemoryEventTracingAdapter`, the one-way adapter that lets this
// package observe `@rmsm/ai-memory` without that package depending on
// this one.

// Domain: enums
export { AIRequestStatus, AI_REQUEST_STATUSES, TraceSource, TRACE_SOURCES } from "./domain/enums/observability.enum";

// Domain: entities
export type { AIRequest } from "./domain/entities/ai-request.entity";
export type { AIResponse } from "./domain/entities/ai-response.entity";
export type { PromptTrace } from "./domain/entities/prompt-trace.entity";
export type { MemoryTrace } from "./domain/entities/memory-trace.entity";
export type { ProviderTrace } from "./domain/entities/provider-trace.entity";
export type { TokenUsage } from "./domain/entities/token-usage.entity";
export type { CostUsage } from "./domain/entities/cost-usage.entity";
export type { LatencyMetric } from "./domain/entities/latency-metric.entity";
export type { RetryMetric } from "./domain/entities/retry-metric.entity";
export type { FailureMetric } from "./domain/entities/failure-metric.entity";
export type { AuditEntry } from "./domain/entities/audit-entry.entity";
export type { ModelPricing } from "./domain/entities/pricing-table.entity";

// Domain: errors
export {
  AIRequestNotFoundError,
  DuplicateAIRequestError,
  InvalidTelemetryDataError,
  UnknownProviderPricingError,
} from "./domain/errors/observability-domain.errors";

// Tracing / metrics ports
export type { TraceRepository } from "./tracing/trace-repository.interface";
export type { MetricsRepository } from "./metrics/metrics-repository.interface";

// Events
export type {
  AIRequestStartedEvent,
  PromptRenderedEvent,
  MemoryLoadedEvent,
  ProviderCalledEvent,
  ProviderCompletedEvent,
  RequestFailedEvent,
  UsageRecordedEvent,
  CostRecordedEvent,
  ObservabilityDomainEvent,
} from "./events/observability-domain-events.interface";
export type { TelemetryPublisher } from "./events/telemetry-publisher.interface";

// Application services
export { TracingService } from "./application/services/tracing.service";
export { MetricsService } from "./application/services/metrics.service";
export { UsageService } from "./application/services/usage.service";
export { CostService } from "./application/services/cost.service";
export { AuditService, type AuditEntryRepository } from "./application/services/audit.service";

// Infrastructure: concrete adapters
export { ConsoleTelemetryPublisher } from "./infrastructure/console-telemetry-publisher";
export { InMemoryTraceRepository } from "./infrastructure/in-memory-trace.repository";
export { InMemoryMetricsRepository } from "./infrastructure/in-memory-metrics.repository";
export { InMemoryAuditEntryRepository } from "./infrastructure/in-memory-audit-entry.repository";
export { MemoryEventTracingAdapter } from "./infrastructure/memory-event-tracing.adapter";
