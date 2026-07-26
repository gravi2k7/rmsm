export interface ExecutiveDashboardGeneratedEvent {
  readonly eventId: string;
  readonly kind: "ExecutiveDashboardGenerated";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly portfolioId: string;
  readonly widgetCount: number;
}

export type ExecutiveDashboardDomainEvent = ExecutiveDashboardGeneratedEvent;
