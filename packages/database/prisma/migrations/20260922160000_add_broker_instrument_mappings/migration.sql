CREATE TABLE "broker_instrument_mappings" (
    "id" TEXT NOT NULL,
    "brokerConnectionId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "brokerSymbol" TEXT NOT NULL,
    "brokerInstrumentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_instrument_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "broker_instrument_mappings_brokerConnectionId_instrumentId_key"
ON "broker_instrument_mappings"("brokerConnectionId", "instrumentId");

CREATE UNIQUE INDEX "broker_instrument_mappings_brokerConnectionId_brokerInstrumentId_key"
ON "broker_instrument_mappings"("brokerConnectionId", "brokerInstrumentId");

CREATE INDEX "broker_instrument_mappings_instrumentId_idx"
ON "broker_instrument_mappings"("instrumentId");

ALTER TABLE "broker_instrument_mappings"
ADD CONSTRAINT "broker_instrument_mappings_brokerConnectionId_fkey"
FOREIGN KEY ("brokerConnectionId")
REFERENCES "broker_connections"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "broker_instrument_mappings"
ADD CONSTRAINT "broker_instrument_mappings_instrumentId_fkey"
FOREIGN KEY ("instrumentId")
REFERENCES "instruments"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
