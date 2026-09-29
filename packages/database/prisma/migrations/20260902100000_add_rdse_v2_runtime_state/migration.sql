CREATE TABLE "rdse_v2_runtime_states" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "htfTimeframe" TEXT NOT NULL,
    "ltfTimeframe" TEXT NOT NULL,

    "htfStructure" TEXT NOT NULL,
    "htfDirection" TEXT,
    "htfSwingType" TEXT,
    "htfSwingNumber" INTEGER,
    "htfSequenceStartTime" TIMESTAMP(3),
    "htfC1Open" DECIMAL,
    "htfC1High" DECIMAL,
    "htfC1Low" DECIMAL,
    "htfReferenceOpen" DECIMAL,
    "htfLastCandleTime" TIMESTAMP(3),

    "ltfStructure" TEXT NOT NULL,
    "ltfDirection" TEXT,
    "ltfSwingType" TEXT,
    "ltfSwingNumber" INTEGER,
    "ltfSequenceStartTime" TIMESTAMP(3),
    "ltfC1Open" DECIMAL,
    "ltfC1High" DECIMAL,
    "ltfC1Low" DECIMAL,
    "ltfReferenceOpen" DECIMAL,
    "ltfLastCandleTime" TIMESTAMP(3),
    "ltfBreakPending" BOOLEAN NOT NULL DEFAULT false,
    "ltfBreakCandleTime" TIMESTAMP(3),
    "ltfBreakReferenceOpen" DECIMAL,

    "positionSide" TEXT,
    "entrySequenceType" TEXT,
    "entrySequenceNumber" INTEGER,
    "entryC1Open" DECIMAL,
    "stopLossPrice" DECIMAL,
    "lastDecisionTime" TIMESTAMP(3),

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rdse_v2_runtime_states_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rdse_v2_runtime_states_strategyVersionId_instrumentId_htfTimeframe_ltfTimeframe_key"
ON "rdse_v2_runtime_states"(
    "strategyVersionId",
    "instrumentId",
    "htfTimeframe",
    "ltfTimeframe"
);

CREATE INDEX "rdse_v2_runtime_states_organizationId_idx"
ON "rdse_v2_runtime_states"("organizationId");

CREATE INDEX "rdse_v2_runtime_states_strategyVersionId_idx"
ON "rdse_v2_runtime_states"("strategyVersionId");

ALTER TABLE "rdse_v2_runtime_states"
ADD CONSTRAINT "rdse_v2_runtime_states_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rdse_v2_runtime_states"
ADD CONSTRAINT "rdse_v2_runtime_states_strategyVersionId_fkey"
FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
