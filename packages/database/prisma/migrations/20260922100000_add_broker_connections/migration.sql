-- CreateEnum
CREATE TYPE "BrokerProvider" AS ENUM ('PROJECTX', 'CTRADER', 'MT5');

-- CreateEnum
CREATE TYPE "BrokerConnectionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateTable
CREATE TABLE "broker_connections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "BrokerProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "status" "BrokerConnectionStatus" NOT NULL DEFAULT 'INACTIVE',
    "lastConnectionTestAt" TIMESTAMP(3),
    "lastConnectionTestStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broker_connections_organizationId_idx" ON "broker_connections"("organizationId");

-- CreateIndex
CREATE INDEX "broker_connections_organizationId_provider_idx" ON "broker_connections"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "broker_connections_status_idx" ON "broker_connections"("status");

-- CreateIndex
CREATE INDEX "trading_accounts_brokerConnectionId_idx" ON "trading_accounts"("brokerConnectionId");

-- AddForeignKey
ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_brokerConnectionId_fkey" FOREIGN KEY ("brokerConnectionId") REFERENCES "broker_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_connections" ADD CONSTRAINT "broker_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
