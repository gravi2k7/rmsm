-- Allow decentralized instruments to have no centralized exchange.
--
-- The preceding migration introduced partial unique indexes that explicitly
-- support exchangeId IS NULL, but the original baseline column remained
-- NOT NULL. This migration reconciles the physical database schema with
-- the Prisma/domain model.

ALTER TABLE "instruments"
  ALTER COLUMN "exchangeId" DROP NOT NULL;
