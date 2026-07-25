export interface FailureMetric {
  readonly requestId: string;
  readonly errorMessage: string;
  readonly errorCode?: string;
  readonly occurredAt: Date;
}
