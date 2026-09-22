ALTER TABLE "trading_orders"
ADD COLUMN "brokerOrderId" TEXT;

CREATE INDEX "trading_orders_brokerOrderId_idx"
ON "trading_orders"("brokerOrderId");
