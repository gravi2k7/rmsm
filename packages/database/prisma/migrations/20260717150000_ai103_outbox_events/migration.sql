-- AI-103 Milestone 4 — transactional outbox table. Purely additive:
-- CREATE TYPE / CREATE TABLE / ALTER TABLE ADD CONSTRAINT only, nothing
-- destructive, nothing touching an existing table's own rows.

CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'POISON');

CREATE TABLE "strategy_outbox_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "userId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "strategy_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "strategy_outbox_events_status_createdAt_idx" ON "strategy_outbox_events"("status", "createdAt");
CREATE INDEX "strategy_outbox_events_organizationId_aggregateId_idx" ON "strategy_outbox_events"("organizationId", "aggregateId");
CREATE INDEX "strategy_outbox_events_correlationId_idx" ON "strategy_outbox_events"("correlationId");

ALTER TABLE "strategy_outbox_events" ADD CONSTRAINT "strategy_outbox_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
