# PRISMA_EXCEPTION_VERIFICATION.md — BVP-003R Task 2 (SEC-002)

## Root cause, confirmed directly

`grep -rln "PrismaClientKnownRequestError" apps/api/src` returned zero matches before this
fix — no code anywhere in `apps/api` explicitly caught any of Prisma's own error types.
`GlobalExceptionFilter`'s fallback branch, `else if (normalized instanceof Error) { message =
normalized.message; }`, meant any uncaught `Error` — including a raw Prisma error — had its
`.message` forwarded directly to the API client. Prisma's own error messages can include real
schema/column/table/constraint names, and `PrismaClientValidationError`'s messages can include
the full attempted query.

## What was fixed

### 1. New Prisma-specific error mapper

`apps/api/src/application/common/errors/prisma-error.mapper.ts` — deliberately built as a
sibling to the existing `domain-error.mapper.ts`, reusing the exact same architectural
pattern (a single, focused adapter converting a foreign error type into this application's own
`AppError` hierarchy) rather than inventing a new approach or inlining the logic into the
filter itself.

| Prisma code | Meaning | Mapped to | Client-facing message |
|---|---|---|---|
| `P2002` | Unique constraint violation | `ConflictError` (409) | `A record with this <field> already exists.` (field name only — real Prisma text never surfaced) |
| `P2025` | Required record not found | `NotFoundError` (404) | `Record not found` |
| `P2003` | Foreign key constraint violation | `ConflictError` (409) | Generic, safe sentence — no field/table names |
| `P2011` | Null constraint violation | `ValidationError` (400) | `<field> is required.` |
| `P2014` | Required relation violation | `ConflictError` (409) | Generic, safe sentence |
| Any other known Prisma code | — | `AppError` (500), code `DATABASE_ERROR` | `An unexpected database error occurred` |
| `PrismaClientValidationError` (malformed query — a programming error, not a client-caused one) | — | `AppError` (500) | `An unexpected database error occurred` |
| `PrismaClientInitializationError` / `PrismaClientRustPanicError` (infrastructure failures) | — | `AppError` (500) | `An unexpected database error occurred` |

Only the field names from `error.meta.target` are ever surfaced to the client — these are
schema field names the caller already knows from the DTO they submitted (e.g. "email already
exists" is standard, expected API behavior), not sensitive infrastructure detail. The raw
Prisma-generated message text (which can include file paths, line numbers, or full query
fragments — confirmed directly in real error instances constructed for the test suite) is
never included.

### 2. `GlobalExceptionFilter` updated

The new mapper is checked before the generic `Error` fallback (Prisma errors are `Error`
instances and would otherwise still reach it). The generic fallback branch itself — `else if
(normalized instanceof Error) { message = normalized.message; }` — was **removed entirely**.
Any error not recognized as a `DomainError`, `AppError`, `HttpException`, or one of the four
Prisma error types now gets the same safe default (`"An unexpected error occurred"`, 500),
regardless of what it is. This closes the leak for Prisma errors specifically, and also for
any *other* kind of unexpected error that was never the specific target of this fix but shared
the same underlying problem.

## Server-side logging — confirmed unchanged

`this.logger.error(...)` still logs the **original, unmodified `exception`** (not the
sanitized `normalized` result) with its full message and stack trace, for every 500-level
response. Confirmed directly in real Jest test runs — the console output during test
execution shows the full original Prisma error text (including the intentionally-embedded
fake file paths used to prove they don't leak to the *client*) in the server-side log lines,
while the JSON response body asserted against in the same test contains only the safe,
generic/mapped message. Nothing about server-side observability was traded away for this fix.

## Response format — confirmed unchanged

The response envelope shape (`{ success, data, error: { code, message, details }, meta }`) is
identical to before this fix. Every mapped Prisma error becomes an `AppError`, which flows
through the exact same, pre-existing `AppError` branch in the filter — no new branch, no new
envelope shape, no new consumer-facing contract change.

## Verification performed

- **Executed, real error instances, not mocks**: both the mapper (`prisma-error.mapper.spec.ts`,
  8 tests) and the filter (`http-exception.filter.spec.ts`, 10 tests) are tested against
  actual `new Prisma.PrismaClientKnownRequestError(...)` / `new
  Prisma.PrismaClientValidationError(...)` instances, constructed with Prisma's real
  constructor signature (verified directly against the installed `@prisma/client` package
  before writing the tests, not assumed) — not hand-rolled fake objects that only superficially
  resemble a Prisma error.
- **Executed**: explicit negative assertions in every test — `expect(...).not.toContain(...)`
  checks for the specific internal strings (file paths, raw constraint text, deadlock/internal
  IP details) that would indicate a leak, not just a positive check that *some* safe message
  was returned.
- **Executed**: all pre-existing filter behavior (`AppError`, `HttpException`, `DomainError`,
  `requestId` in `meta`) re-verified unchanged in the same test file.
- **Executed**: full `apps/api` suite — 99 suites / 655 tests passing, 0 regressions. `apps/api`
  lint — clean.
- **Unverified** (needs live infrastructure): an actual Prisma error being thrown by a real
  query against a real PostgreSQL database in this running application (e.g. actually
  triggering a real unique-constraint violation via a live HTTP request) — this sandbox has no
  real PostgreSQL (standing limitation throughout this project). The tests above verify the
  mapper and filter logic directly and correctly against real Prisma error *objects*: what
  remains unverified is only the *triggering* of those objects by a live database, not the
  handling of them once thrown.

## Remaining risk

Low. The fix is narrow (one new file, one filter modification), reuses an established,
already-proven architectural pattern, is backed by tests against real error instances rather
than approximations, and does not change the response envelope or any existing, working error
path. The only residual gap — live-database error triggering — is an execution-environment
limitation, not a logic gap; the logic that would handle a real triggered error is the exact
logic tested here.
