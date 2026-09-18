-- CreateEnum
CREATE TYPE "TradingOrderSide" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TradingOrderType" AS ENUM ('MARKET');

-- CreateEnum
CREATE TYPE "TradingOrderStatus" AS ENUM ('PENDING', 'FILLED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TradingPositionSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "TradingPositionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "trading_orders" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "side" "TradingOrderSide" NOT NULL,
    "type" "TradingOrderType" NOT NULL DEFAULT 'MARKET',
    "quantity" DECIMAL(30,10) NOT NULL,
    "status" "TradingOrderStatus" NOT NULL DEFAULT 'PENDING',
    "requestedPrice" DECIMAL(24,10),
    "executedPrice" DECIMAL(24,10),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filledAt" TIMESTAMP(3),

    CONSTRAINT "trading_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_fills" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "price" DECIMAL(24,10) NOT NULL,
    "quantity" DECIMAL(30,10) NOT NULL,
    "commission" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "filledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trading_fills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_positions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "side" "TradingPositionSide" NOT NULL,
    "quantity" DECIMAL(30,10) NOT NULL,
    "averageEntryPrice" DECIMAL(24,10) NOT NULL,
    "status" "TradingPositionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "averageExitPrice" DECIMAL(24,10),
    "realizedPnl" DECIMAL(24,8),

    CONSTRAINT "trading_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_trades" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "side" "TradingPositionSide" NOT NULL,
    "quantity" DECIMAL(30,10) NOT NULL,
    "entryPrice" DECIMAL(24,10) NOT NULL,
    "exitPrice" DECIMAL(24,10) NOT NULL,
    "realizedPnl" DECIMAL(24,8) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trading_orders_accountId_createdAt_idx" ON "trading_orders"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "trading_orders_accountId_status_idx" ON "trading_orders"("accountId", "status");

-- CreateIndex
CREATE INDEX "trading_orders_instrumentId_createdAt_idx" ON "trading_orders"("instrumentId", "createdAt");

-- CreateIndex
CREATE INDEX "trading_fills_orderId_filledAt_idx" ON "trading_fills"("orderId", "filledAt");

-- CreateIndex
CREATE INDEX "trading_positions_accountId_status_idx" ON "trading_positions"("accountId", "status");

-- CreateIndex
CREATE INDEX "trading_positions_accountId_instrumentId_status_idx" ON "trading_positions"("accountId", "instrumentId", "status");

-- CreateIndex
CREATE INDEX "trading_positions_instrumentId_status_idx" ON "trading_positions"("instrumentId", "status");

-- CreateIndex
CREATE INDEX "trading_trades_accountId_closedAt_idx" ON "trading_trades"("accountId", "closedAt");

-- CreateIndex
CREATE INDEX "trading_trades_accountId_instrumentId_closedAt_idx" ON "trading_trades"("accountId", "instrumentId", "closedAt");

-- AddForeignKey
ALTER TABLE "trading_orders" ADD CONSTRAINT "trading_orders_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_orders" ADD CONSTRAINT "trading_orders_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_fills" ADD CONSTRAINT "trading_fills_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "trading_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_positions" ADD CONSTRAINT "trading_positions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_positions" ADD CONSTRAINT "trading_positions_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_trades" ADD CONSTRAINT "trading_trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "trading_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_trades" ADD CONSTRAINT "trading_trades_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
