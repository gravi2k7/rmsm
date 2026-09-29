ALTER TABLE "trading_orders"
ADD COLUMN "clientOrderId" TEXT;

CREATE INDEX "trading_orders_clientOrderId_idx"
ON "trading_orders"("clientOrderId");
