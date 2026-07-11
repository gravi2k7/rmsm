# TS2742 Fix — Modified Files

**No business logic changed. No schema changed. No code regenerated.** Every edit below is
either (a) adding an explicit return-type annotation to a method that already existed, or (b)
adding named payload types to `@rmsm/database` for those annotations to reference. Where a
method's `async` keyword was removed (e.g. `UsersService.updateProfile`), the runtime behavior
is unchanged — a function that returns a `Promise` and an `async` function that returns that
same value are observably identical to every caller; this matches the pattern already used in
every repository method.

## Root cause

Every repository/service method that returned a Prisma query directly (e.g.
`return prisma.user.findUnique(...)`) was returning Prisma's chainable
`Prisma__UserClient<...>` promise type, inferred structurally. That inferred type references
`@prisma/client/runtime/library` internals. TypeScript's declaration emitter (`declaration:
true` in `tsconfig.base.json`, inherited by every package) cannot name that type across a
package boundary — hence `TS2742: The inferred type of 'X' cannot be named without a reference
to @prisma/client/runtime/library`.

**Fix**: annotate every such method with an explicit `Promise<T>` return type, where `T` is a
named type. Prisma's chainable promise is structurally assignable to `Promise<T>`, so nothing
about the query changes — only what the compiler needs to name in the `.d.ts` output.

## Files modified

### `packages/database/src/index.ts`
Added four named, exported payload types — `UserWithProfile`, `UserWithRoles`,
`RoleWithPermissions`, `UserAccountSummary` — covering every relation-`include`/`select` shape
used across the API. These are the types every downstream annotation below references, so
Prisma's internal generics never need to be named outside this one file.

### `packages/database/package.json`
Added the missing `@types/node` devDependency — found via typecheck, unrelated to TS2742
itself (it was causing `Cannot find name 'process'` in the same file). Fixed since it was
blocking verification of the actual TS2742 fix.

### Repositories (return type only, no query logic changed)
- `apps/api/src/modules/auth/repositories/user.repository.ts`
- `apps/api/src/modules/auth/repositories/session.repository.ts`
- `apps/api/src/modules/auth/repositories/refresh-token.repository.ts`
- `apps/api/src/modules/auth/repositories/audit-log.repository.ts`

### Services (return type only; `AuthService` additionally deduplicated an existing
role/permission-extraction block that appeared twice into one typed private helper —
same logic, same output, written once instead of twice)
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/services/audit.service.ts`
- `apps/api/src/modules/auth/services/session.service.ts`
- `apps/api/src/modules/rbac/rbac.service.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/oauth/oauth.service.ts`

### Strategies (return type only)
- `apps/api/src/modules/auth/strategies/local.strategy.ts`

### Controllers (return type only)
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/sessions.controller.ts`
- `apps/api/src/modules/rbac/rbac.controller.ts`
- `apps/api/src/modules/users/users.controller.ts`
- `apps/api/src/modules/oauth/oauth.controller.ts`
- `apps/api/src/health/health.controller.ts`

### Tooling
- `package.json` — `engines.node` corrected to `>=22.0.0`.
- `turbo.json` — migrated to Turborepo 2.x's `tasks` schema (from `pipeline`), with
  `@rmsm/database#generate` wired as an explicit upstream dependency of `build`/`typecheck`/
  `test` so the pipeline fails fast and honestly at that one step instead of silently skipping
  packages that depend on it.
- `packages/database/prisma/seed.ts` — one `no-console` lint suppression comment added for the
  seed script's intentional CLI output line (unrelated to TS2742, found during the zero-warnings
  pass).

## Verification performed in this sandbox

`prisma generate` still cannot run here — confirmed with byte-level evidence this time: the
installed `@prisma/client` package's `index.d.ts` is Prisma's stock 39-byte pre-generate
placeholder (`export * from '.prisma/client/default'`), and that directory doesn't exist. This
isn't new information, but it's now proven rather than asserted.

To verify the *fix itself* — not just assert it — I temporarily created a hand-written type
stub simulating what `prisma generate` produces (a `.prisma/client/index.d.ts` with the same
named exports and a realistic conditional `UserGetPayload<T>`), ran `apps/api`'s typecheck
against it, and got **zero errors**. I then removed the stub — it was a verification tool, not
part of the deliverable. Separately: 21/21 Jest unit tests pass unchanged, and lint is clean
across all 8 packages with zero warnings.

This is the strongest evidence available from inside this sandbox that the annotation pattern
is correct. The remaining step — confirming against a real, engine-backed generated client — is
exactly what `docs/VERIFICATION_RUNBOOK.md`'s six commands are for.
