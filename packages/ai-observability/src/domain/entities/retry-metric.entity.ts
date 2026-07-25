export interface RetryMetric {
  readonly requestId: string;
  readonly attempt: number;
  readonly reason: string;
  readonly occurredAt: Date;
}
