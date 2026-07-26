export interface ExecutiveReportGeneratedEvent {
  readonly eventId: string;
  readonly kind: "ExecutiveReportGenerated";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly portfolioId: string;
  readonly period: string;
}

export type ExecutiveReportsDomainEvent = ExecutiveReportGeneratedEvent;
