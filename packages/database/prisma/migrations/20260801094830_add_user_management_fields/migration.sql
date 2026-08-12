-- Module 004 (Enterprise Identity & Administration Suite) — additive
-- columns only. Both are nullable/defaulted; no backfill required and no
-- existing row becomes invalid.
ALTER TABLE "users"
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "sessions"
  ADD COLUMN "trustedAt" TIMESTAMP(3);
