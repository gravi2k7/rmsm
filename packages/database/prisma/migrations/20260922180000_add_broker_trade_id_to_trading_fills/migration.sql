ALTER TABLE "trading_fills"
ADD COLUMN "brokerTradeId" TEXT;

CREATE UNIQUE INDEX "trading_fills_brokerTradeId_key"
ON "trading_fills"("brokerTradeId");
