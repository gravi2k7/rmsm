-- CreateEnum
CREATE TYPE "PriceAlertCondition" AS ENUM ('ABOVE', 'BELOW');

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "interval" "CandleInterval" NOT NULL,
    "condition" "PriceAlertCondition" NOT NULL,
    "targetPrice" DECIMAL(24,10) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "oneShot" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" TIMESTAMP(3),
    "triggeredPrice" DECIMAL(24,10),
    "triggeredCandleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_alerts_organizationId_userId_isActive_idx"
ON "price_alerts"("organizationId", "userId", "isActive");

-- CreateIndex
CREATE INDEX "price_alerts_instrumentId_interval_isActive_idx"
ON "price_alerts"("instrumentId", "interval", "isActive");

-- CreateIndex
CREATE INDEX "price_alerts_organizationId_instrumentId_interval_isActive_idx"
ON "price_alerts"("organizationId", "instrumentId", "interval", "isActive");

-- AddForeignKey
ALTER TABLE "price_alerts"
ADD CONSTRAINT "price_alerts_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "organizations"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts"
ADD CONSTRAINT "price_alerts_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts"
ADD CONSTRAINT "price_alerts_instrumentId_fkey"
FOREIGN KEY ("instrumentId")
REFERENCES "instruments"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
