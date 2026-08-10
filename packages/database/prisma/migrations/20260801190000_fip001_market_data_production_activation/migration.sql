-- FIP-001 (Market Data Platform Production Activation). Purely additive:
-- new nullable/defaulted columns on four existing tables (provider
-- config priority + connection-test tracking, instrument point value,
-- import job batching/resume/scheduling/retry, gap repair-source
-- tracking) plus three new tables and one new enum for quality scoring,
-- derived-indicator persistence, and AI-readiness snapshots. No existing
-- column is dropped, renamed, or retyped; no existing row's data is
-- touched.

-- AlterTable: market_data_provider_configs — provider priority + connection test tracking
ALTER TABLE "market_data_provider_configs" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "market_data_provider_configs" ADD COLUMN "lastConnectionTestAt" TIMESTAMP(3);
ALTER TABLE "market_data_provider_configs" ADD COLUMN "lastConnectionTestStatus" TEXT;

-- AlterTable: instruments — point value
ALTER TABLE "instruments" ADD COLUMN "pointValue" DECIMAL(20,10);

-- AlterTable: data_import_jobs — batching / resume / scheduling / retry
ALTER TABLE "data_import_jobs" ADD COLUMN "instrumentId" TEXT;
ALTER TABLE "data_import_jobs" ADD COLUMN "interval" "CandleInterval";
ALTER TABLE "data_import_jobs" ADD COLUMN "dateRangeStart" TIMESTAMP(3);
ALTER TABLE "data_import_jobs" ADD COLUMN "dateRangeEnd" TIMESTAMP(3);
ALTER TABLE "data_import_jobs" ADD COLUMN "isIncremental" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "data_import_jobs" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 100;
ALTER TABLE "data_import_jobs" ADD COLUMN "scheduledFor" TIMESTAMP(3);
ALTER TABLE "data_import_jobs" ADD COLUMN "resumeCursor" TIMESTAMP(3);
ALTER TABLE "data_import_jobs" ADD COLUMN "parentJobId" TEXT;
ALTER TABLE "data_import_jobs" ADD COLUMN "totalBatches" INTEGER;
ALTER TABLE "data_import_jobs" ADD COLUMN "completedBatches" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "data_import_jobs" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_parentJobId_fkey"
    FOREIGN KEY ("parentJobId") REFERENCES "data_import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "data_import_jobs_scheduledFor_status_idx" ON "data_import_jobs"("scheduledFor", "status");
CREATE INDEX "data_import_jobs_instrumentId_interval_idx" ON "data_import_jobs"("instrumentId", "interval");

-- AlterTable: data_gaps — repair-source tracking
ALTER TABLE "data_gaps" ADD COLUMN "repairedByProviderId" TEXT;
ALTER TABLE "data_gaps" ADD COLUMN "repairAttempts" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "data_gaps" ADD CONSTRAINT "data_gaps_repairedByProviderId_fkey"
    FOREIGN KEY ("repairedByProviderId") REFERENCES "market_data_provider_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "CandleValidationStatus" AS ENUM ('PENDING', 'VALID', 'FLAGGED', 'REJECTED');

-- CreateTable
CREATE TABLE "candle_quality_metadata" (
    "id" TEXT NOT NULL,
    "candleId" TEXT NOT NULL,
    "qualityScore" DECIMAL(5,2) NOT NULL,
    "confidenceScore" DECIMAL(5,2) NOT NULL,
    "validationStatus" "CandleValidationStatus" NOT NULL DEFAULT 'PENDING',
    "importVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceProviderType" "MarketDataProviderType" NOT NULL,
    "importTimestamp" TIMESTAMP(3) NOT NULL,
    "processingTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingDurationMs" INTEGER NOT NULL,

    CONSTRAINT "candle_quality_metadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candle_quality_metadata_candleId_key" ON "candle_quality_metadata"("candleId");
CREATE INDEX "candle_quality_metadata_validationStatus_idx" ON "candle_quality_metadata"("validationStatus");

ALTER TABLE "candle_quality_metadata" ADD CONSTRAINT "candle_quality_metadata_candleId_fkey"
    FOREIGN KEY ("candleId") REFERENCES "market_candles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "derived_indicator_snapshots" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "interval" "CandleInterval" NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "indicatorKey" TEXT NOT NULL,
    "outputs" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "derived_indicator_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "derived_indicator_snapshots_instrumentId_interval_eventTim_key" ON "derived_indicator_snapshots"("instrumentId", "interval", "eventTime", "indicatorKey");
CREATE INDEX "derived_indicator_snapshots_instrumentId_interval_eventTim_idx" ON "derived_indicator_snapshots"("instrumentId", "interval", "eventTime");

ALTER TABLE "derived_indicator_snapshots" ADD CONSTRAINT "derived_indicator_snapshots_instrumentId_fkey"
    FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "market_data_ai_snapshots" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "interval" "CandleInterval" NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "trend" TEXT,
    "volatility" TEXT,
    "liquidity" TEXT,
    "confidence" DECIMAL(5,2),
    "session" TEXT,
    "spread" DECIMAL(20,10),
    "marketRegime" TEXT,
    "anomalyFlags" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_data_ai_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "market_data_ai_snapshots_instrumentId_interval_eventTime_key" ON "market_data_ai_snapshots"("instrumentId", "interval", "eventTime");
CREATE INDEX "market_data_ai_snapshots_instrumentId_interval_eventTime_idx" ON "market_data_ai_snapshots"("instrumentId", "interval", "eventTime");

ALTER TABLE "market_data_ai_snapshots" ADD CONSTRAINT "market_data_ai_snapshots_instrumentId_fkey"
    FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
