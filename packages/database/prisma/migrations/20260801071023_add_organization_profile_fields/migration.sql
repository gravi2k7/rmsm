-- Module 003 (Organization Management) — additive columns only.
-- All new columns are nullable or carry a default; no backfill is
-- required and no existing row becomes invalid.
ALTER TABLE "organizations"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en-US';
