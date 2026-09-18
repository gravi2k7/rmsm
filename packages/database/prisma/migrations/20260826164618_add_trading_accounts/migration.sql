-- CreateEnum
CREATE TYPE "TradingAccountType" AS ENUM ('DEMO', 'LIVE');

-- CreateEnum
CREATE TYPE "TradingAccountStatus" AS ENUM ('ACTIVE', 'RESET', 'CLOSED');

-- CreateEnum
CREATE TYPE "TradingLedgerEntryType" AS ENUM ('INITIAL_DEPOSIT', 'VIRTUAL_DEPOSIT', 'RESET', 'WITHDRAWAL', 'TRADE_DEBIT', 'TRADE_CREDIT', 'FEE', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "feature_flags" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "trading_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "type" "TradingAccountType" NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startingBalance" DECIMAL(24,8),
    "balance" DECIMAL(24,8) NOT NULL,
    "status" "TradingAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "brokerConnectionId" TEXT,
    "brokerAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "trading_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_ledger_entries" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "TradingLedgerEntryType" NOT NULL,
    "amount" DECIMAL(24,8) NOT NULL,
    "balanceAfter" DECIMAL(24,8) NOT NULL,
    "reference" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trading_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trading_accounts_organizationId_idx" ON "trading_accounts"("organizationId");

-- CreateIndex
CREATE INDEX "trading_accounts_ownerUserId_idx" ON "trading_accounts"("ownerUserId");

-- CreateIndex
CREATE INDEX "trading_accounts_organizationId_ownerUserId_idx" ON "trading_accounts"("organizationId", "ownerUserId");

-- CreateIndex
CREATE INDEX "trading_accounts_organizationId_type_idx" ON "trading_accounts"("organizationId", "type");

-- CreateIndex
CREATE INDEX "trading_accounts_status_idx" ON "trading_accounts"("status");

-- CreateIndex
CREATE INDEX "trading_ledger_entries_accountId_createdAt_idx" ON "trading_ledger_entries"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "trading_ledger_entries_accountId_type_idx" ON "trading_ledger_entries"("accountId", "type");

-- AddForeignKey
ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_accounts" ADD CONSTRAINT "trading_accounts_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_ledger_entries" ADD CONSTRAINT "trading_ledger_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "derived_indicator_snapshots_instrumentId_interval_eventTim_idx" RENAME TO "derived_indicator_snapshots_instrumentId_interval_eventTime_idx";

-- RenameIndex
ALTER INDEX "derived_indicator_snapshots_instrumentId_interval_eventTim_key" RENAME TO "derived_indicator_snapshots_instrumentId_interval_eventTime_key";
