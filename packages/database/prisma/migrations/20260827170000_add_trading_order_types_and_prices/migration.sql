-- Extend trading order types for Order/DOM workflows.
ALTER TYPE "TradingOrderType" ADD VALUE 'LIMIT';
ALTER TYPE "TradingOrderType" ADD VALUE 'STOP';
ALTER TYPE "TradingOrderType" ADD VALUE 'STOP_LIMIT';

-- Store conditional order prices.
ALTER TABLE "trading_orders"
  ADD COLUMN "limitPrice" DECIMAL(24,10),
  ADD COLUMN "stopPrice" DECIMAL(24,10);
