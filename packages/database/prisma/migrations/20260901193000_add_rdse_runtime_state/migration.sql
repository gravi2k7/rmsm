ALTER TABLE "strategy_versions"
ADD COLUMN "runtimeKey" TEXT;

CREATE TABLE "rdse_runtime_states" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "refOpen" DECIMAL(65,30),
    "refExtreme" DECIMAL(65,30),
    "inPullback" BOOLEAN NOT NULL DEFAULT false,
    "mustReclaim" BOOLEAN NOT NULL DEFAULT false,
    "promoOpen" DECIMAL(65,30),
    "lastProcessedCandleTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdse_runtime_states_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rdse_runtime_states_strategyVersionId_instrumentId_timeframe_key"
ON "rdse_runtime_states"("strategyVersionId", "instrumentId", "timeframe");

CREATE INDEX "rdse_runtime_states_organizationId_idx"
ON "rdse_runtime_states"("organizationId");

CREATE INDEX "rdse_runtime_states_strategyVersionId_idx"
ON "rdse_runtime_states"("strategyVersionId");

ALTER TABLE "rdse_runtime_states"
ADD CONSTRAINT "rdse_runtime_states_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "organizations"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "rdse_runtime_states"
ADD CONSTRAINT "rdse_runtime_states_strategyVersionId_fkey"
FOREIGN KEY ("strategyVersionId")
REFERENCES "strategy_versions"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
