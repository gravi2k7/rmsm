-- CreateEnum
CREATE TYPE "Mt5WorkerStatus" AS ENUM (
    'ACTIVE',
    'DRAINING',
    'OFFLINE',
    'DISABLED'
);

-- CreateTable
CREATE TABLE "mt5_workers" (
    "id" TEXT NOT NULL,
    "workerKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gatewayUrl" TEXT NOT NULL,
    "status" "Mt5WorkerStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mt5_workers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mt5_workers_workerKey_key"
    ON "mt5_workers"("workerKey");

-- CreateIndex
CREATE INDEX "mt5_workers_status_idx"
    ON "mt5_workers"("status");

-- AlterTable
ALTER TABLE "broker_connections"
    ADD COLUMN "mt5WorkerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "broker_connections_mt5WorkerId_key"
    ON "broker_connections"("mt5WorkerId");

-- AddForeignKey
ALTER TABLE "broker_connections"
    ADD CONSTRAINT "broker_connections_mt5WorkerId_fkey"
    FOREIGN KEY ("mt5WorkerId")
    REFERENCES "mt5_workers"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
