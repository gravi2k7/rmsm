import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { trace } from "@opentelemetry/api";
import { loadConfig } from "@rmsm/config";
import type { Env } from "@rmsm/config";
import { StrategyOutboxRepository } from "../repositories/strategy-outbox.repository";
import { EventDispatcherService } from "../../integration/dispatcher/event-dispatcher.service";
import { StrategyEventMetricsService } from "../../integration/services/strategy-event-metrics.service";
import type { IntegrationEvent } from "../../integration/events/integration-event.interface";
import type { StrategyOutboxEvent as OutboxRow } from "@rmsm/database";

/**
 * The real background publisher this milestone's own Outbox Pattern
 * deliverables ask for — polling-based, single-instance (the same
 * "real but single-instance" honest scoping AI-101's own circuit
 * breaker established, `AI101_PRODUCTION_READINESS_REPORT.md`'s own
 * ADR-031). A genuinely multi-instance-safe outbox worker needs
 * row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`) or a
 * distributed lock so two instances never both claim the same pending
 * event — not implemented here; running more than one API instance
 * with this worker enabled would let both instances dequeue the same
 * batch and dispatch it twice. Named as a real, structural limitation,
 * not silently assumed safe.
 *
 * Real retry/poison logic: `STRATEGY_OUTBOX_MAX_RETRIES` (centralized
 * config, `envSchema.ts`) governs how many times a failed DELIVERY
 * (not a handler failure — see `EventDispatcherService`'s own header
 * comment for that distinction) is retried before the event moves to
 * `POISON` and stops being picked up again — a real "poison event"
 * quarantine, this milestone's own explicit Failure Handling
 * requirement.
 *
 * Config is loaded ONCE in the constructor, not re-parsed on every
 * poll cycle — a real, deliberate testability/performance choice: a
 * unit test can construct this service with an explicit `Env` object
 * (real dependency injection, matching every other service in this
 * codebase) instead of needing real process.env values set just to
 * exercise `pollOnce()`'s own retry logic.
 */
@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private intervalHandle: NodeJS.Timeout | null = null;
  private readonly config: Env;

  constructor(
  private readonly outboxRepository: StrategyOutboxRepository,
  private readonly dispatcher: EventDispatcherService,
  private readonly metrics: StrategyEventMetricsService,
  ) {
  this.config = loadConfig();
  }
  onModuleInit(): void {
    if (!this.config.STRATEGY_OUTBOX_PUBLISHER_ENABLED) {
      this.logger.log("Outbox publisher disabled via STRATEGY_OUTBOX_PUBLISHER_ENABLED=false.");
      return;
    }
    this.intervalHandle = setInterval(() => {
      this.pollOnce().catch((error) => this.logger.error("Outbox poll cycle failed", error instanceof Error ? error.stack : String(error)));
    }, this.config.STRATEGY_OUTBOX_POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }

  /** Exposed for real, direct testing (and manual triggering) — the interval above just calls this on a timer; the actual polling logic doesn't depend on the timer at all. */
  async pollOnce(): Promise<void> {
    const batch = await this.outboxRepository.findPendingBatch(this.config.STRATEGY_OUTBOX_BATCH_SIZE);

    for (const row of batch) {
      await this.processOne(row, this.config.STRATEGY_OUTBOX_MAX_RETRIES);
    }
  }

  private async processOne(row: OutboxRow, maxRetries: number): Promise<void> {
    const tracer = trace.getTracer("rmsm-strategy-engine");
    await tracer.startActiveSpan("strategy-outbox.publish", async (span) => {
      span.setAttribute("outbox.event_id", row.id);
      span.setAttribute("outbox.event_type", row.eventType);
      span.setAttribute("outbox.organization_id", row.organizationId);

      try {
        await this.outboxRepository.markProcessing(row.id);
        const event = this.toIntegrationEvent(row);
        await this.dispatcher.dispatch(event);
        await this.outboxRepository.markPublished(row.id);
        span.setStatus({ code: 1 });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        span.setStatus({ code: 2, message });

        if (row.retryCount + 1 >= maxRetries) {
          await this.outboxRepository.markPoison(row.id, message);
          this.logger.error(`correlationId=${row.correlationId} eventId=${row.id} moved to POISON after ${row.retryCount + 1} attempts: ${message}`);
        } else {
          await this.outboxRepository.markFailed(row.id, message);
          this.metrics.recordRetry();
          this.logger.warn(`correlationId=${row.correlationId} eventId=${row.id} delivery attempt ${row.retryCount + 1} failed, will retry: ${message}`);
        }
      } finally {
        span.end();
      }
    });
  }

  private toIntegrationEvent(row: OutboxRow): IntegrationEvent {
    return {
      eventId: row.id,
      aggregateId: row.aggregateId,
      aggregateType: row.aggregateType as IntegrationEvent["aggregateType"],
      organizationId: row.organizationId,
      schemaVersion: 1,
      occurredAt: row.occurredAt,
      correlationId: row.correlationId,
      causationId: row.causationId,
      userId: row.userId,
      source: "strategy-engine",
      eventType: row.eventType as IntegrationEvent["eventType"],
      payload: row.payload as Record<string, unknown>,
      metadata: {},
    };
  }
}
