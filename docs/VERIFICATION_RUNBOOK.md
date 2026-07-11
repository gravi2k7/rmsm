# Verification Runbook

Run this on any machine with normal internet access (laptop, CI runner, cloud dev box —
anywhere `binaries.prisma.sh` isn't network-restricted). It was written after this exact
sequence was run in a sandboxed environment where step 2 is blocked by an outbound network
allowlist that doesn't include Prisma's binary host — everything else in this list was
independently verified there.

```bash
# 1. Install
pnpm install

# 2. Generate the Prisma client (blocked in restricted sandboxes; fine everywhere else)
pnpm --filter @rmsm/database generate

# 3. Bring up local infra
docker compose -f infra/docker/docker-compose.yml up -d postgres redis

# 4. Apply the schema (creates all 15 tables, incl. the 14 Module 002 IAM models)
pnpm --filter @rmsm/database migrate:dev

# 5. Seed default roles/permissions
pnpm --filter @rmsm/database seed

# 6. Now the full root-level gate should pass end-to-end:
pnpm lint        # expect: 0 errors, 0 warnings, 8/8 packages
pnpm typecheck    # expect: pass now that @rmsm/database#generate succeeded
pnpm test         # expect: unit tests + e2e (register/login/refresh/lockout) all pass
pnpm build        # expect: web, admin, api all build; ai has no `build` step (interpreted)
```

## What was already verified without step 2 (in the restricted sandbox)

- `pnpm install` — full workspace, including `argon2`'s native binary compiling via
  `node-gyp-build`.
- `pnpm lint` — 0 errors, 0 warnings across all 8 TypeScript packages.
- 21/21 Jest unit tests for `apps/api` (excluding anything importing `@rmsm/database`):
  Argon2 hash/verify round-trips, JWT sign/verify + forged-signature rejection, TOTP
  generate/verify, AES-256-GCM secret encrypt/decrypt round-trip, recovery-code
  generation/hashing, `RolesGuard`/`PermissionsGuard` any-of/all-of semantics, password-policy
  boundary conditions.
- `apps/web` and the dependency-free packages (`types`, `shared`, `config`) — typecheck clean,
  lint clean, tests passing.
- Four real bugs found and fixed via typecheck that were **not** related to the Prisma
  blocker: a possible-`undefined` index in `TokenService`'s TTL parser, unsafe buffer
  destructuring in `TwoFactorService.decryptSecret`, a `Map` type-inference issue across a
  discriminated union in `OAuthProviderRegistry`, and duplicated role/permission-extraction
  logic in `AuthService` refactored into one typed helper.

## What step 2 unblocks

Everything downstream of a generated Prisma client: `apps/api` typecheck/build, the
`health.controller.spec.ts` unit test, and both e2e suites
(`auth-flow.e2e-spec.ts`, `account-lockout.e2e-spec.ts`), which are the tests that actually
prove registration → email verification → login → protected-route access → refresh rotation →
reuse-detection → account lockout all work end-to-end against a real database. That's the
strongest evidence for this module's acceptance criteria, and it's written and ready — it just
needs a machine that can reach `binaries.prisma.sh`.
