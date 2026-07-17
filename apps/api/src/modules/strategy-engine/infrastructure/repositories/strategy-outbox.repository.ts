import { Injectable } from "@nestjs/common";
import { prisma, Prisma, OutboxEventStatus } from "@rmsm/database";
import type { StrategyOutboxEvent as OutboxRow } from "@rmsm/database";

export interface OutboxEventInput {
  id: string;
  organizationId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: object;
  correlationId: string;
  causationId: string | null;
  userId: string | null;
  occurredAt: Date;
}

/**
 * Real CRUD against the `strategy_outbox_events` table — the
 * persistence side of "Persist events... Background publisher...
 * Retry mechanism... Poison event handling" (this milestone's own
 * Outbox Pattern deliverables). `findPendingBatch()` locks nothing
 * explicitly (a real, honest limitation for a genuinely
 * multi-instance deployment — see `OutboxPublisherService`'s own
 * header comment for why this matches AI-101's own "real but
 * single-instance" circuit-breaker precedent rather than claiming
 * distributed-safe polling this milestone doesn't actually build).
 */
@Injectable()
export class StrategyOutboxRepository {
  async enqueue(events: OutboxEventInput[]): Promise<void> {
    await prisma.strategyOutboxEvent.createMany({
      data: events.map((e) => ({
        id: e.id,
        organizationId: e.organizationId,
        aggregateId: e.aggregateId,
        aggregateType: e.aggregateType,
        eventType: e.eventType,
        payload: JSON.parse(JSON.stringify(e.payload)) as Prisma.InputJsonValue,
        correlationId: e.correlationId,
        causationId: e.causationId,
        userId: e.userId,
        occurredAt: e.occurredAt,
      })),
    });
  }

  async findPendingBatch(batchSize: number): Promise<OutboxRow[]> {
    return prisma.strategyOutboxEvent.findMany({ where: { status: OutboxEventStatus.PENDING }, orderBy: { createdAt: "asc" }, take: batchSize });
  }

  async markProcessing(id: string): Promise<void> {
    await prisma.strategyOutboxEvent.update({ where: { id }, data: { status: OutboxEventStatus.PROCESSING } });
  }

  async markPublished(id: string): Promise<void> {
    await prisma.strategyOutboxEvent.update({ where: { id }, data: { status: OutboxEventStatus.PUBLISHED, processedAt: new Date() } });
  }

  /** Increments retryCount; the caller decides PENDING (retry) vs POISON (exhausted) based on the returned row's own new retryCount against the configured max. */
  async markFailed(id: string, error: string): Promise<OutboxRow> {
    return prisma.strategyOutboxEvent.update({ where: { id }, data: { status: OutboxEventStatus.PENDING, retryCount: { increment: 1 }, lastError: error } });
  }

  async markPoison(id: string, error: string): Promise<void> {
    await prisma.strategyOutboxEvent.update({ where: { id }, data: { status: OutboxEventStatus.POISON, lastError: error, processedAt: new Date() } });
  }

  async countByStatus(status: OutboxEventStatus): Promise<number> {
    return prisma.strategyOutboxEvent.count({ where: { status } });
  }
}
