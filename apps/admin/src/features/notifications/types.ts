export interface NotificationMetrics {
  [key: string]: number;
}

export interface DeadLetterJob {
  id: string;
  queueName: string;
  payload: unknown;
  attempts: number;
  failureReason?: string;
  createdAt: string;
}

export interface RedactedProvider {
  id: string;
  type: string;
  name: string;
  createdAt: string;
}
