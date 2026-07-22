# BVP003_REMEDIATION.md — BVP-003R Summary

Remediation pass following BVP-003 (API Verification). Architecture (DDD/CQRS/Clean
Architecture) preserved throughout — every fix reuses an existing, established pattern in this
codebase rather than introducing a new one.

## Findings addressed

| Finding | Status | Evidence | Root Cause | Verification | Remaining Risk |
|---|---|---|---|---|---|
| SEC-001 (Critical) — CORS origin allowlist empty for all non-local environments | **Fixed** | `main.ts`'s `origin: APP_ENV === "local" ? true : []`; inline comment confirmed it as a known, deferred placeholder | CORS allowlisting was scoped as a Phase 5 objective early in this project but never picked up by any specific subsequent milestone | 101/101 `packages/config` tests (6 new), 7/7 new `resolveCorsOrigins()` tests including 2 explicit regression tests; full `apps/api` typecheck clean | Low — live preflight-request smoke test recommended on first real staging deploy (see `CORS_VERIFICATION.md`) |
| SEC-002 (High) — no Prisma error mapping; generic errors leak raw `.message` | **Fixed** | `grep -rln "PrismaClientKnownRequestError" apps/api/src` returned nothing before this fix | Prisma-originated errors were never given the same treatment as `DomainError`s, which already had a dedicated mapper | 18/18 new tests against real `Prisma.PrismaClientKnownRequestError`/`PrismaClientValidationError` instances, explicit negative assertions that raw text never appears in responses; full `apps/api` suite 99/99 suites, 655/655 tests | Low — live-database error triggering unverified (no real PostgreSQL in this sandbox), but the handling logic itself is fully tested against real error objects |
| CON-001 (Medium) — two pagination envelope shapes coexist | **Deferred** (reviewed, not migrated) | `packages/database`'s `PaginatedResult<T>` vs. the Phase 4A application layer's `{items, total}`; confirmed `apps/web` has 3 real `Paginated<T>` interfaces depending on the current shape | Built independently, in different phases, before a shared pagination utility existed | Direct code inspection; no test regression risk since no code changed | Medium (unchanged) — real inconsistency remains; migration path documented in `PAGINATION_CONSISTENCY_REPORT.md`, correctly out of scope for a breaking change in this pass |
| CON-007 (Medium) — `sortBy`/`sortDirection`/`search` silently no-op on several list endpoints | **Not addressed this pass** | Documented since Phase 4C; not re-verified line-by-line this pass | Query handlers never implemented these parameters, though the DTO accepts them | Not re-executed this pass | Unchanged — out of this remediation's declared scope (Tasks 1–3 only); flagged here for completeness, not silently dropped |

## Architecture preserved

- **DDD**: no domain package (`@rmsm/core`, `@rmsm/{market,strategy,opportunity,decision,
  execution,portfolio}`) was touched. `DomainError` and its subclasses are completely
  unchanged.
- **CQRS**: no command/query handler was modified. The Prisma error mapper operates at the
  same layer `domain-error.mapper.ts` already does (the exception-filter boundary, not inside
  any handler).
- **Clean Architecture**: the new `prisma-error.mapper.ts` follows the exact same
  adapter-at-the-boundary pattern as the pre-existing `domain-error.mapper.ts` — no new
  architectural concept introduced, an existing one extended to a new error source.

## Files changed (3 commits, one per logical fix)

**Commit 1 (SEC-001)**: `packages/config/src/schemas/app.schema.ts`,
`packages/config/src/env/env.validator.ts`,
`packages/config/src/__tests__/env.validator.test.ts`, `apps/api/src/main.ts`,
`apps/api/src/common/cors/resolve-cors-origins.ts` (new),
`apps/api/src/common/cors/__tests__/resolve-cors-origins.spec.ts` (new)

**Commit 2 (SEC-002)**: `apps/api/src/application/common/errors/prisma-error.mapper.ts` (new),
`apps/api/src/application/common/errors/__tests__/prisma-error.mapper.spec.ts` (new),
`apps/api/src/common/filters/http-exception.filter.ts`,
`apps/api/src/common/filters/__tests__/http-exception.filter.spec.ts` (new)

**Task 3**: no files changed (review-only, per its own explicit scope — see
`PAGINATION_CONSISTENCY_REPORT.md`)

## Final validation sweep

See the actual command output below (this section written after running the full sequence,
not before — the sub-report files above are then finalized against these confirmed results).

| Gate | Result |
|---|---|
| `pnpm install` | ✅ Clean |
| `pnpm lint` (all 17 packages) | ✅ Clean, 0 errors/warnings |
| `pnpm typecheck` (all 17 packages) | ✅ Clean, 0 errors — including 3 real errors caught and fixed during this exact sweep (2 TS2353 constructor-typing issues in new test files, 1 real typo: `HttpStatus.IM_A_TEAPOT` → `I_AM_A_TEAPOT`) |
| `pnpm test` (all packages) | ✅ **1,567 / 1,567 passing** (912 across 12 `packages/*`, 179 `apps/web`, 27 `apps/admin`, 655/655 across 99 suites `apps/api`) — net +31 from this pass's own new tests (6 CORS-guard tests in `packages/config`, 7 `resolveCorsOrigins()` tests, 18 Prisma-mapper/filter tests), 0 regressions |
| `pnpm build` (all packages + apps) | ✅ Clean — 11 workspace packages, `apps/api` (`nest build`), `apps/web` (26/26 routes), `apps/admin` (21/21 routes) |

## Confirmation: no regressions introduced

- Every pre-existing test in every package still passes, unchanged, verified by exact
  before/after count comparison (BVP-002's baseline: 1,536 total → this pass: 1,567 total,
  the difference being exactly this pass's own new tests, not a net change from any deleted
  or altered pre-existing test).
- The one real bug caught mid-pass (3 typecheck errors in the SEC-002 fix's own new test
  files) was found and fixed by this remediation's own mandated final validation sweep,
  amended into the same commit rather than left as a separate "fix my mistake" commit —
  the sweep did its job.
- No `apps/web`/`apps/admin` behavior changed — Task 3 (pagination) was reviewed and
  deliberately not migrated, precisely to avoid the real, confirmed breaking-change risk to
  three existing `Paginated<T>` consumers in `apps/web`.

## What remains open

- CON-001 (pagination shape unification) — deferred, with a concrete non-breaking migration
  path documented in `PAGINATION_CONSISTENCY_REPORT.md`
- CON-007 (`sortBy`/`sortDirection`/`search` silently no-op) — out of this pass's declared
  scope (Tasks 1–3 only covered SEC-001, SEC-002, and pagination review)
- Live-infrastructure verification for both fixes (real CORS preflight request, real
  Prisma-error-triggering database) — this sandbox has no live server/PostgreSQL, a standing
  limitation throughout this project; the logic itself is fully tested against real inputs,
  only its live triggering by real infrastructure is unverified
