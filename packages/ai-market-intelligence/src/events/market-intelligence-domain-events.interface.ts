import type { DomainEvent } from "@rmsm/core";

export interface RegimeDetectedEvent extends DomainEvent {
  readonly kind: "RegimeDetected";
  readonly symbolCode: string;
  readonly regime: string;
}

export interface MarketAlertRaisedEvent extends DomainEvent {
  readonly kind: "MarketAlertRaised";
  readonly symbolCode: string;
  readonly severity: string;
  readonly code: string;
}

export interface MarketSummaryGeneratedEvent extends DomainEvent {
  readonly kind: "MarketSummaryGenerated";
  readonly symbolCode: string;
}

export type MarketIntelligenceDomainEvent = RegimeDetectedEvent | MarketAlertRaisedEvent | MarketSummaryGeneratedEvent;
