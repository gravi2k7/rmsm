# Test Coverage — Module 003, Phase 5

## The target vs. what's measurable in this sandbox

The prompt asks for >=95% coverage on controllers, services, repositories, and authorization.
I want to be direct about this rather than presenting a number that isn't real: **coverage is
a runtime measurement of which lines actually executed**, and the code this phase needs to
cover — every controller, every service method, every repository query — only executes when
called through a live NestJS app talking to a real Postgres database. This sandbox cannot run
that (same `binaries.prisma.sh` network block documented in every phase since Module 001), so
I cannot produce a real coverage percentage for this code from inside this sandbox. Saying
otherwise would be fabricating a number.

## What I can tell you honestly

**Test *cases* written, by area** (this is a count of test scenarios, not a coverage
percentage — see `API_TEST_MATRIX.md` for the full mapping):

| Suite | Test cases |
|---|---|
| `organization-lifecycle.e2e-spec.ts` | 8 |
| `membership-lifecycle.e2e-spec.ts` | 13 |
| `authorization-matrix.e2e-spec.ts` | 14 |
| `validation-rules.e2e-spec.ts` | 11 |
| `concurrency.e2e-spec.ts` | 5 |
| `database-integrity.e2e-spec.ts` | 7 |
| `api-contract.e2e-spec.ts` | 7 |
| `security.e2e-spec.ts` | 7 |
| `performance.e2e-spec.ts` | 5 |
| **Total new e2e test cases** | **77** |

**Existing unit test baseline, independently confirmed still passing this phase**: 21 tests
(Argon2, JWT, TOTP, AES-GCM, Module 002 RBAC guards, Decision 1's last-active-Owner guard from
Phase 4). These don't touch `@rmsm/database` and ran successfully in this sandbox — see
`TEST_RESULTS.md`.

**What every one of the 77 new e2e cases needs to actually run**: `prisma generate` succeeding
(unblocked by normal network access) and a live Postgres instance (`docker compose up`, per
`docs/VERIFICATION_RUNBOOK.md` from Module 002's delivery, unchanged and still accurate). Once
both are available:

```bash
pnpm --filter @rmsm/database generate
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
pnpm --filter @rmsm/database migrate:dev
pnpm --filter @rmsm/database seed
pnpm --filter @rmsm/api test:e2e -- --coverage
```

That last command is the one that produces a real, trustworthy coverage number. I'm not going
to estimate what it would say — a guess dressed up as a measurement would be worse than no
number at all.

## What I did verify, and why it's meaningful even without a coverage percentage

- **Every test file typechecks against a stub I built specifically to reflect Prisma's actual
  generated shapes** (named types, `const`-union enums, both `$transaction` overloads —
  refined incrementally across this whole project as real gaps were found; see the TS2742 fix
  and the Phase 4 typecheck-regression fix for that history). Zero typecheck errors.
- **Every test file is lint-clean**: zero `any`, zero unused imports, zero placeholders —
  confirmed by direct `grep`, not just ESLint's own scope.
- **Manual code review confirms each test exercises the real stack** (repository → service →
  controller → HTTP → database), not a mocked shortcut — `database-integrity.e2e-spec.ts` is
  the only suite that talks to Prisma directly rather than through HTTP, and that's
  intentional (it's testing schema-level constraints, not the API).
- **The concurrency suite's assertions are meaningful by construction**: `Promise.all()` fires
  genuinely simultaneous HTTP requests at the same running server; the assertions
  (`expect(statuses).toEqual([201, 409])`, `expect(activeOwners).toBe(1)`) test observable
  outcomes, not implementation internals, so they'd catch a real regression in Decision 1's
  transaction-based enforcement even without me being able to watch them run here.

## Coverage this phase does NOT claim, stated explicitly

- A real, measured percentage for any file.
- That 77 test cases is the "right" number for 95% coverage — it's the number needed to cover
  every listed requirement in the prompt's Test Areas section at least once, with the
  validation/authorization/concurrency edge cases each getting dedicated coverage. Achieving a
  specific percentage threshold requires running `--coverage` and iterating against the actual
  report, which needs the live database this sandbox doesn't have.
