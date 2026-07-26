export interface CopilotQuestionAnsweredEvent {
  readonly eventId: string;
  readonly kind: "CopilotQuestionAnswered";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly sessionId: string;
  readonly intent: string;
}

export type TradingCopilotDomainEvent = CopilotQuestionAnsweredEvent;
