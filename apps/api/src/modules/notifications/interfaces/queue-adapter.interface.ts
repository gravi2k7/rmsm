import type { NotificationPriority } from "@rmsm/database";

/**
 * Abstraction over the actual queue backend. Module 001 already provides
 * BullMQ (QueueModule, Redis-backed) — this interface exists so
 * QueueService depends on a contract, not directly on BullMQ's API
 * surface, matching this project's established "depend on an interface,
 * not a concrete library" discipline (same reasoning as the payment/OAuth
 * provider abstractions). The one and only implementation Phase 2 needs
 * to write is a thin BullMqQueueAdapter — this is not a new queue system,
 * it's a seam around the existing one.
 */

export interface EnqueueOptions {
  priority?: NotificationPriority;
  delayMs?: number;
  maxAttempts?: number;
  /// Named queue, e.g. "email", "sms", "push", "digest" — the spec's
  /// Queue System section lists these as logically separate queues.
  queueName: string;
  /**
   * Phase 2c addition: an explicit job id, letting the caller use one
   * shared identifier across both BullMQ and the durable
   * NotificationQueue table (ADR-017) — QueueService creates the
   * NotificationQueue row first, then passes that row's own id here, so
   * moveToDeadLetter()/retry() only ever need one id, not two correlated
   * ones. Omitted, BullMQ generates its own.
   */
  jobId?: string;
}

export interface QueueJob<T = Record<string, unknown>> {
  id: string;
  queueName: string;
  payload: T;
  attempts: number;
}

export interface QueueAdapter {
  enqueue<T>(payload: T, options: EnqueueOptions): Promise<QueueJob<T>>;
  /** Moves a failed job to the dead-letter queue after maxAttempts is exhausted — QueueService's retry policy calls this, not raw BullMQ. */
  moveToDeadLetter(jobId: string, queueName: string, reason: string): Promise<void>;
  retry(jobId: string, queueName: string): Promise<void>;
}
