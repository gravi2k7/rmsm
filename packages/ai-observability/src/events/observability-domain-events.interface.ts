import type { DomainEvent } from "@rmsm/core";
import type { TokenUsage } from "../domain/entities/token-usage.entity";
import type { CostUsage } from "../domain/entities/cost-usage.entity";

/**
 * AI-204's OWN telemetry events — raised as it observes an AI request's
 * lifecycle, not to be confused with the events it *consumes* from
 * AI-201/202/203 (those arrive through each package's own event shapes,
 * e.g. `@rmsm/ai-memory`'s `MemoryDomainEvent`, via the adapters in
 * `infrastructure/`). These are what a consumer of *this* package's own
 * `TelemetryPublisher` receives.
 */

export interface AIRequestStartedEvent extends DomainEvent {
  readonly kind: "AIRequestStarted";
  readonly requestId: string;
  readonly organizationId: string | null;
}

export interface PromptRenderedEvent extends DomainEvent {
  readonly kind: "PromptRendered";
  readonly requestId: string;
  readonly templateId: string;
  readonly templateVersion: string;
}

export interface MemoryLoadedEvent extends DomainEvent {
  readonly kind: "MemoryLoaded";
  readonly requestId: string;
  readonly conversationId: string | null;
  readonly entryCount: number;
}

export interface ProviderCalledEvent extends DomainEvent {
  readonly kind: "ProviderCalled";
  readonly requestId: string;
  readonly providerName: string;
  readonly model: string;
}

export interface ProviderCompletedEvent extends DomainEvent {
  readonly kind: "ProviderCompleted";
  readonly requestId: string;
  readonly providerName: string;
  readonly model: string;
  readonly succeeded: boolean;
  readonly durationMs: number;
}

export interface RequestFailedEvent extends DomainEvent {
  readonly kind: "RequestFailed";
  readonly requestId: string;
  readonly errorMessage: string;
  readonly errorCode?: string;
}

export interface UsageRecordedEvent extends DomainEvent {
  readonly kind: "UsageRecorded";
  readonly requestId: string;
  readonly tokenUsage: TokenUsage;
}

export interface CostRecordedEvent extends DomainEvent {
  readonly kind: "CostRecorded";
  readonly requestId: string;
  readonly costUsage: CostUsage;
}

export type ObservabilityDomainEvent =
  | AIRequestStartedEvent
  | PromptRenderedEvent
  | MemoryLoadedEvent
  | ProviderCalledEvent
  | ProviderCompletedEvent
  | RequestFailedEvent
  | UsageRecordedEvent
  | CostRecordedEvent;
