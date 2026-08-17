-- Support decentralized instruments whose canonical identity
-- does not belong to a centralized exchange.
--
-- Listed instruments:
--   UNIQUE(exchangeId, symbol) when exchangeId IS NOT NULL
--
-- Decentralized instruments:
--   UNIQUE(symbol) when exchangeId IS NULL

DROP INDEX IF EXISTS "instruments_exchangeId_symbol_key";

CREATE UNIQUE INDEX "instruments_exchangeId_symbol_key"
  ON "instruments" ("exchangeId", "symbol")
  WHERE "exchangeId" IS NOT NULL;

CREATE UNIQUE INDEX "instruments_symbol_decentralized_key"
  ON "instruments" ("symbol")
  WHERE "exchangeId" IS NULL;
