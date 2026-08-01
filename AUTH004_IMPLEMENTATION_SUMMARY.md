# AUTH-004 — Bootstrap Administrator

**Status:** Complete
**Scope:** `prisma/seed.ts` (packages/database) now creates the platform's first `SUPER_ADMIN` account from environment variables, idempotently, so a fresh deployment is never left with zero users. Additive to the existing seed step (roles/permissions/plans/feature flags/strategy categories are untouched) and to Authentication (its password hashing implementation was relocated, not changed — see below).

---

## 1. Implementation Summary

### The problem this solves

`prisma/seed.ts` already seeds roles, permissions, subscription plans, feature flags, and strategy categories — but never a user. A freshly deployed platform therefore has zero accounts and no way to log in. AUTH-004 closes that gap: the seed script now creates one `SUPER_ADMIN` account from `BOOTSTRAP_ADMIN_*` environment variables, and does so safely on every future seed run.

### Architecture

`packages/database/src/seed/bootstrap-admin.ts` is a new, standalone, typed, unit-testable module — deliberately placed under `src/` (not `prisma/`) so it's covered by `pnpm typecheck` and testable the same way every other `packages/database/src/__tests__` file already is. `prisma/seed.ts` itself only grew by one import and one `await bootstrapAdministrator(prisma, { ...five env vars... })` call near the end of `main()` (after role seeding, since it looks up the `SUPER_ADMIN` role by name).

`bootstrapAdministrator()` takes a `PrismaClient` and a plain `{ email?, password?, firstName?, lastName?, organization? }` object — it reads nothing from `process.env` itself, which is what makes it testable with plain objects instead of environment mutation. `prisma/seed.ts` is the one place that reads `process.env.BOOTSTRAP_ADMIN_*` and passes the result in.

### Idempotency (the prompt's primary requirement)

The entire creation path is gated on one check: **does any user already hold the `SUPER_ADMIN` role** (`prisma.userRole.findFirst({ where: { role: { name: "SUPER_ADMIN" } } })`) — not "does a user with this specific email exist." That's deliberate:

- Re-running the seed after a bootstrap admin already exists (the common case — seed runs on every deploy) is always a safe no-op. Prints `✓ Bootstrap administrator already exists` and returns.
- An operator who later promotes some other account to `SUPER_ADMIN` through the product itself also causes this step to stand down — it isn't tied to the bootstrap email specifically, it's tied to "does the platform already have an administrator."

If no `SUPER_ADMIN` exists yet, everything — `User` + `Profile` + `UserRole` + (optionally) `Organization` + `OrganizationMembership` + `AuditLog` — is created inside **one Prisma transaction**, so a mid-way failure can never leave a half-created admin (a user with no role, or a role with no organization) behind.

### Password hashing — reused, not reinvented

AUTH-004 explicitly requires reusing Authentication's existing hashing implementation rather than inventing a second one. The seed script (`packages/database`) cannot depend on `apps/api`'s NestJS-DI-scoped `PasswordService`, so the actual `argon2.hash()`/`argon2.verify()` calls (and their one parameter set — Argon2id, 19 MiB memory cost, OWASP 2023 minimum) were extracted from `PasswordService` into `@rmsm/shared`'s new `hashPassword()`/`verifyPasswordHash()`. `PasswordService.hash()`/`.verify()` now delegate to these — same public API, same behavior, verified against its own existing spec (still 3/3 passing, unchanged). The bootstrap-admin module calls the exact same `hashPassword()` function. One implementation, two callers, instead of two independently-maintained copies of the same argon2 call.

The bootstrap password is checked against `@rmsm/shared`'s `DEFAULT_PASSWORD_POLICY` (12+ characters, upper/lowercase, a number, a symbol) — the same policy object Authentication's own `PasswordService` enforces by default. It is not passed through `PASSWORD_MIN_LENGTH` (an `@rmsm/config`-sourced, environment-configurable override `PasswordService` also supports) — deliberately: wiring `packages/database`'s seed script through `@rmsm/config`'s full validated `Env` would require every other unrelated environment variable that schema validates (SMTP, Stripe, JWT secrets, etc.) to also be present and valid just to run `pnpm seed`, which would break today's seed script for any environment that doesn't already have that entire surface configured — a real regression AUTH-004's own "no breaking changes" rule forbids. `process.env.BOOTSTRAP_ADMIN_*` is read directly in `seed.ts`, matching how this script has always worked (it has never depended on `@rmsm/config`) and how Prisma's own `DATABASE_URL` is read.

### Environment validation

- Neither `BOOTSTRAP_ADMIN_EMAIL` nor `BOOTSTRAP_ADMIN_PASSWORD` set → **not an error** — bootstrap-admin creation is skipped with an informational log. Not every seed run needs to create an admin (e.g. a throwaway/CI database seeded only for its roles/permissions/plans data); forcing these to always be set would make them mandatory everywhere, which the prompt doesn't ask for.
- Either one set without the other → aborts with a `ValidationError` naming exactly which var is missing (per AUTH-004's own Security section: "If password is missing, abort seed with clear validation error" — the same treatment is applied symmetrically to email, since a user can't be created without one either).
- Password set but fails `checkPasswordPolicy` → aborts with a `ValidationError` listing the specific policy failures.
- A user with the bootstrap email already exists (and — since this branch is only reached when no `SUPER_ADMIN` exists yet — is definitely *not* an existing admin) → aborts with a clear error rather than either silently promoting an unrelated account to `SUPER_ADMIN` or crashing on the `email` unique-constraint violation Prisma would otherwise throw.
- `SUPER_ADMIN` role not yet seeded (seed-ordering bug, shouldn't happen in a normal run) → aborts with a clear error instead of a confusing foreign-key failure.

### Fields without a named requirement — judgment calls, flagged explicitly (matching this file's own existing convention for undocumented decisions)

- **firstName/lastName**: optional per the prompt; default to `"System"`/`"Administrator"` when unset.
- **organization**: if `BOOTSTRAP_ADMIN_ORGANIZATION` is set, an `Organization` is created (or reused, if one with that exact name already exists — same collision-retry-suffix approach `OnboardingService.generateUniqueSlug()` already uses for regular signups, reimplemented locally since `packages/database` can't depend back on `apps/api`'s application layer) and the bootstrap admin becomes its `OWNER`. If unset, no organization is created — the account still has full platform `SUPER_ADMIN` access via `UserRole`, which is a platform-wide grant independent of any organization (Module 003's own design note: platform RBAC and per-organization roles are deliberately separate concerns).
- **"system account" marking**: the schema's `User` model has no dedicated `isSystem`/`system` boolean column (unlike `Role`, which already has one). Adding one would mean a new Prisma migration — out of scope for "Only implement AUTH-004 Bootstrap Administrator." "Active" and "email verified" are both real, existing columns (`status: "ACTIVE"`, `emailVerifiedAt: now()`) and are set directly; "system account" is instead captured in the `AuditLog` entry's `metadata` (`{ source: "seed" }`), the only extensible place available without a schema change.

---

## 2. Files Changed

**New:**
- `packages/database/src/seed/bootstrap-admin.ts` — the module described above.
- `packages/database/src/seed/__tests__/bootstrap-admin.test.ts` — 15 tests.
- `packages/shared/src/password-hash.ts` — extracted Argon2id `hashPassword()`/`verifyPasswordHash()`.
- `.env.example` (repo root) — did not previously exist; documents the 5 new `BOOTSTRAP_ADMIN_*` vars (see its own header comment for why it doesn't attempt to also document the platform's much larger pre-existing env surface).
- `AUTH004_IMPLEMENTATION_SUMMARY.md` — this file.

**Modified (additive/refactor-only):**
- `packages/database/prisma/seed.ts` — one new import, one new `await bootstrapAdministrator(...)` call in `main()`. Nothing else changed.
- `packages/shared/src/index.ts` — added `export * from "./password-hash";`.
- `packages/shared/package.json` — added `argon2` dependency (same version already pinned in `apps/api`).
- `packages/database/package.json` — added `@rmsm/shared` workspace dependency.
- `api/src/modules/auth/services/password.service.ts` — `hash()`/`verify()` now delegate to `@rmsm/shared`'s `hashPassword()`/`verifyPasswordHash()` instead of calling `argon2` inline. Public API and behavior unchanged; `assertPolicy()` (the `PASSWORD_MIN_LENGTH`-aware policy check) is untouched and still runs first inside `hash()`.

**Not touched:** Authentication's controllers/DTOs/other services, RBAC schema, Organization/Membership schema, Docker, `.env` loading (`@rmsm/config`), and every other seed section (roles/permissions/plans/feature flags/strategy categories).

---

## 3. Environment Variables Added

All optional as a pair — see Environment Validation above for exact abort/skip behavior.

| Variable | Required? | Default |
|---|---|---|
| `BOOTSTRAP_ADMIN_EMAIL` | Required if `BOOTSTRAP_ADMIN_PASSWORD` is set | — |
| `BOOTSTRAP_ADMIN_PASSWORD` | Required if `BOOTSTRAP_ADMIN_EMAIL` is set | — |
| `BOOTSTRAP_ADMIN_FIRST_NAME` | No | `"System"` |
| `BOOTSTRAP_ADMIN_LAST_NAME` | No | `"Administrator"` |
| `BOOTSTRAP_ADMIN_ORGANIZATION` | No | none (no organization created) |

Documented in `.env.example` (repo root, newly created by this task).

---

## 4. Validation Checklist

| Check | Result |
|---|---|
| Typecheck (`bootstrap-admin.ts`, its test, `@rmsm/shared`'s new `password-hash.ts`) | **Pass** — isolated `tsc --strict` (same flags as `tsconfig.base.json`: `noUnusedLocals`/`noUnusedParameters`/`noUncheckedIndexedAccess`/`noFallthroughCasesInSwitch`), zero errors |
| Typecheck (refactored `password.service.ts` + full existing `apps/api` email/broker/market-data domain) | **Pass** — same isolated sandbox used for every prior milestone (MD-001…EM-001): 38 pre-existing, out-of-scope errors unchanged, **zero new errors** |
| Test: first seed creates the admin | **Pass** |
| Test: second seed is a no-op, no duplicate | **Pass** |
| Test: duplicate prevention with different bootstrap env vars on the second run | **Pass** |
| Test: role assignment (`SUPER_ADMIN` `UserRole` row created) | **Pass** |
| Test: password hashing (Argon2id hash stored, never plaintext) | **Pass** — real `argon2`, not mocked |
| Test: environment validation (missing password / missing email / policy-violating password / both unset → skip) | **Pass** (4 scenarios) |
| Test: firstName/lastName defaults | **Pass** |
| Test: organization + `OWNER` membership created when configured | **Pass** |
| Test: no organization created when unconfigured | **Pass** |
| Test: audit log entry written | **Pass** |
| Test: pre-existing non-admin account with the bootstrap email → clear error, not a crash or silent promotion | **Pass** |
| Test: seed-ordering guard (`SUPER_ADMIN` role not yet seeded) | **Pass** |
| **Total: 15/15 new tests passing** (real `vitest`, real `argon2`, real `@rmsm/shared`) | |
| `PasswordService`'s own existing spec, unchanged | **3/3 still passing** (real Jest/ts-jest, real `argon2`, real refactored `@rmsm/shared`) |
| Full regression — every prior milestone's suite (MD-001…EM-001) + `password.service.spec.ts` | **61/61 suites, 564/564 tests passing** |
| `pnpm lint` | **Not run against the real monorepo** — no full `pnpm install` in this environment (see Manual Verification). New `console.log` calls follow the exact `// eslint-disable-next-line no-console` convention `seed.ts` already uses throughout. |
| `pnpm build` (full monorepo, all 7 packages + `apps/api`) | **Not run against the real monorepo** — see Manual Verification |
| `docker compose up` | **Not run** — see Manual Verification |

### Why lint/build/Docker weren't run directly

This sandbox never had a full `pnpm install` of the actual monorepo (matching every prior milestone's methodology — MD-001 through EM-001 were all verified the same way: an isolated `tsc --strict` sandbox with hand-written type stubs for exactly the packages touched, plus real Jest/vitest execution of the actual new/changed source files). For AUTH-004 specifically, that meant: compiling the real, current `@rmsm/shared` (including the new `password-hash.ts`) with the real `argon2` npm package, and running the real, unmodified `password.service.spec.ts` and the new `bootstrap-admin.test.ts` against that real compiled output — not mocks. That's real confirmation the code behaves correctly; it isn't a substitute for the monorepo's own `pnpm lint`/`pnpm build`/`docker compose up`, which only your environment (with its full workspace `node_modules`, generated Prisma client, and Docker daemon) can run.

---

## 5. Manual Verification Steps

1. `pnpm install` (picks up the two new `package.json` dependency additions: `argon2` in `@rmsm/shared`, `@rmsm/shared` in `@rmsm/database`).
2. `pnpm --filter @rmsm/database... build` (or the full `pnpm build`) — confirms `@rmsm/shared`'s new `password-hash.ts` and `@rmsm/database`'s new `src/seed/bootstrap-admin.ts` compile cleanly in the real workspace.
3. `pnpm --filter @rmsm/shared test` and `pnpm --filter @rmsm/database test` — the new `bootstrap-admin.test.ts` (15 tests) and existing `@rmsm/database` suite should all pass; `pnpm --filter @rmsm/api test -- password.service` should still show 3/3 passing.
4. Set in your root `.env` (see the newly added `.env.example` for the exact names):
   ```
   BOOTSTRAP_ADMIN_EMAIL=admin@yourcompany.com
   BOOTSTRAP_ADMIN_PASSWORD=<a real, policy-compliant password — 12+ chars, upper/lower/number/symbol>
   BOOTSTRAP_ADMIN_FIRST_NAME=Jane
   BOOTSTRAP_ADMIN_LAST_NAME=Doe
   BOOTSTRAP_ADMIN_ORGANIZATION=Acme Corp
   ```
5. `pnpm --filter @rmsm/database seed` (or `docker compose up`, which runs the same seed on startup) against a database with no existing `SUPER_ADMIN`. Expect:
   ```
   ✓ Bootstrap administrator created

   Email:
   admin@yourcompany.com

   Role:
   SUPER_ADMIN
   ```
6. Run the seed a second time. Expect: `✓ Bootstrap administrator already exists`, and confirm via `psql`/Prisma Studio that no second `users` row was created.
7. Log in as `admin@yourcompany.com` with the password you set, and confirm the account has `SUPER_ADMIN`-level access (e.g. every permission `ROLE_GRANTS.SUPER_ADMIN` names in `seed.ts`) and, if `BOOTSTRAP_ADMIN_ORGANIZATION` was set, owns that organization.
8. Confirm the password was never printed to any log — grep your seed output/logs for the literal password string; it should not appear anywhere.
9. Check the `audit_logs` table for one row with `action = 'admin.bootstrap_created'` and `userId` matching the new account.
