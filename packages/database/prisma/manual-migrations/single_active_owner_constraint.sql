-- Module 003, Decision 1 (Phase-2 Review Response): defense-in-depth for
-- "exactly one active Owner per organization."
--
-- Prisma's schema DSL cannot express a partial/filtered unique index, so
-- this cannot live in schema.prisma — it must be hand-written and folded
-- into migration history via `prisma migrate dev --create-only` (see the
-- runbook at the bottom of this file). This is the database-layer half of
-- RMSM's defense-in-depth: OrganizationMembershipService (Phase 3)
-- validates the invariant in application code first; this index is the
-- backstop against concurrent transactions, race conditions, future code
-- regressions, and direct SQL writes that bypass the service layer
-- entirely.
--
-- Column names below are unquoted-camelCase-as-written because no Prisma
-- model in this schema uses @map on individual fields — Postgres treats
-- unquoted identifiers as case-folded-to-lowercase, so every reference to
-- a camelCase column must be double-quoted to preserve its case, exactly
-- as Prisma's own generated migrations do.

CREATE UNIQUE INDEX IF NOT EXISTS "organization_memberships_one_active_owner"
ON "organization_memberships" ("organizationId")
WHERE "role" = 'OWNER' AND "status" = 'ACTIVE';

-- Rollback (not run automatically — Prisma migrations have no built-in
-- down-migration; keep this for manual reference):
-- DROP INDEX IF EXISTS "organization_memberships_one_active_owner";

-- ═══════════════════════════════════════════════════════════════════════
-- RUNBOOK — how to fold this into real Prisma migration history
--
-- This sandbox has never successfully run `prisma migrate dev` (blocked
-- by network policy — same limitation documented in every prior module's
-- verification section). No baseline migration exists yet for ANY of this
-- schema, Module 002 included. So this file is delivered as raw SQL, not
-- as a numbered migration folder with a fabricated timestamp — creating
-- fake Prisma migration metadata I have no way to verify would be worse
-- than being upfront that this step needs to happen on a real machine.
--
-- On a machine with normal network access:
--
--   1. pnpm --filter @rmsm/database generate
--   2. pnpm --filter @rmsm/database migrate:dev --name init
--      (creates the baseline migration for the entire schema as it
--      stands today — Module 001 through Module 003's Phase 2 tables)
--   3. pnpm --filter @rmsm/database exec prisma migrate dev --create-only --name single_active_owner_constraint
--      (creates an empty migration.sql, since this index isn't declared
--      in schema.prisma — Prisma sees no schema diff)
--   4. Replace the contents of that generated, empty migration.sql with
--      the CREATE UNIQUE INDEX statement above (everything from
--      "CREATE UNIQUE INDEX" through the semicolon — not this runbook).
--   5. pnpm --filter @rmsm/database migrate:dev
--      (applies it)
--
-- Known caveat, documented rather than hidden: because this index isn't
-- expressed in schema.prisma, `prisma migrate dev` and `prisma db pull`
-- won't know about it. Future schema changes to `organization_memberships`
-- should NOT be applied via `prisma db push` (which can drop
-- unrecognized indexes) — always use `prisma migrate dev`, which only
-- adds migrations, never resets based on introspection.
-- ═══════════════════════════════════════════════════════════════════════
