# AI-103 Milestone 2 — Fix Pass: TypeScript/Prisma Compatibility

Status: Complete. No domain layer, architecture, or repository interface changes — every fix is
confined to `infrastructure/mappers/` and `infrastructure/repositories/`.

## Why This Happened

My original implementation typechecked clean against this project's own simplified, hand-written
offline Prisma stub (the real `prisma generate` is network-blocked in this sandbox, the standing
limitation since AI-101 Phase 1). That stub modeled `Json` columns loosely (`any`) and enum
columns as bare string-union types with no runtime object — looser than what a real, generated
Prisma client actually enforces. Every category below is a real gap between "passes against a
loose stub" and "satisfies the real generated types" — not new bugs, but latent ones the stub
couldn't catch. Two changes fixed this for good: I added real runtime enum const objects and
`Prisma.JsonNull`/`Prisma.InputJsonValue` to the stub (matching Prisma's actual dual type+value
export pattern), and then fixed every call site the stricter types now flag.

## Files Changed (16)

**Created (2)**
- `infrastructure/mappers/json-value.util.ts` — real JSON serialization helpers
- `infrastructure/mappers/enum-mappers.util.ts` — exhaustive enum translation functions

**Modified (14)**
- 9 mappers: `condition.mapper.ts`, `rule-group.mapper.ts`, `strategy.mapper.ts`,
  `strategy-version.mapper.ts`, `strategy-parameter.mapper.ts`, `strategy-approval.mapper.ts`,
  `strategy-history.mapper.ts`, `execution-profile.mapper.ts`, `strategy-validation.mapper.ts`
- 4 repositories: `strategy.repository.ts`, `strategy-version.repository.ts`,
  `strategy-approval.repository.ts`, `category-tag.repository.ts`
- 1 test: `strategy.repository.spec.ts`

`rule.mapper.ts`, `strategy-publication.mapper.ts`, `strategy-history.repository.ts`,
`strategy-validation.repository.ts`, `strategy-publication.repository.ts`,
`execution-profile.repository.ts` were reviewed and needed no change (no JSON fields, no enum
casts, or already correct).

## Fix 1 — JSON ↔ Domain Mapping

**Problem**: every JSON field went through a bare `as object` (or `as unknown as object`) type
assertion — a compiler-only promise, not a real guarantee the value is JSON-safe.

**Fix**: `json-value.util.ts`'s `toJsonInput()` round-trips every value through
`JSON.parse(JSON.stringify(value))` — a real structural guarantee, typed as
`Prisma.InputJsonValue` (the real generated input type), not a bare cast. Applied to:
`Condition.leftOperand`/`rightOperand`, `ExecutionProfile.parameters`,
`StrategyValidation.findings`, `StrategyHistoryEntry.metadata`. Read-side, `fromJsonValue<T>()`
centralizes the necessary reverse cast (Prisma's own `JsonValue` type is a wide union no read
call site can avoid asserting a narrower shape against) into one named, documented function
instead of scattering ad hoc `as X` casts across every mapper.

## Fix 2 — Prisma Enum Mapping

**Problem**: every enum-typed field went through a blind `as SomeType` cast on a raw domain
string literal — structurally correct only because the domain's own string values happen to be
spelled identically to the Prisma enum's values, with no compiler check that they actually stay
that way.

**Fix**: `enum-mappers.util.ts` — 18 real, exhaustive functions (both directions, for all 9
enums crossing the domain/persistence boundary), each referencing the real Prisma-generated
enum's own runtime member (`StrategyCategoryCode.MEAN_REVERSION`, not the string literal
`"MEAN_REVERSION"` asserted into place) and ending in a `const exhaustive: never = ...` branch —
an unhandled case, or a typo in a case label, is now a compile error, not a silent pass-through.
Also caught and fixed a real, separate bug this surfaced: `StrategyRepository.list()`'s own
filter handling passed `filter.status`/`filter.category` (domain values) straight into a Prisma
`where` clause with no translation at all.

## Fix 3 — Nullable JSON Fields

**Problem**: `Condition.rightOperandUpper` and `StrategyParameter.allowedValues` (both nullable
`Json?` columns) were assigned a bare JavaScript `null`. Prisma distinguishes `Prisma.DbNull`
(the SQL column is NULL) from `Prisma.JsonNull` (the column holds the JSON literal `null`) — a
real, generated-type-level distinction a bare `null` doesn't satisfy for `Json?` fields
specifically (ordinary nullable scalars, like `StrategyApproval.decidedByUserId`, correctly keep
using plain `null` — that distinction doesn't apply to them, and those call sites are
unchanged).

**Fix**: `toNullableJsonInput()` returns `Prisma.JsonNull` when there's no value, the real
serialized value otherwise — never an ambiguous bare `null`.

## Fix 4 — Repository Create/Update Inputs

**Problem**: two real, unsafe escape hatches — `strategy-version.repository.ts`'s own
`hydrate()` accepted a narrowed inline object type and passed a `row as never` cast into the
mapper (bypassing type-checking entirely at that boundary); several `.map()` callbacks used
inline structural types instead of the real generated row types.

**Fix**: `hydrate()` now takes the real `StrategyVersion` (from `@rmsm/database`) directly — no
cast needed. Every `.map()` callback across `strategy-version.repository.ts` and
`category-tag.repository.ts` now types its parameter against the real generated row type
(`StrategyVersionRow`, `StrategyCategoryRow`, `StrategyTagRow`) instead of a narrowed inline
shape. Added one new named payload type, `StrategyTagAssignmentWithTag`
(`@rmsm/database`'s own export), replacing another inline structural type in
`strategy.repository.ts`'s tag-reconciliation logic.

## Fix 5 — Repository Test Fixtures

**Problem**: `strategy.repository.spec.ts`'s own `jest.mock("@rmsm/database")` factory only
mocked `prisma` — once the mapper functions started importing real enum const objects from the
same module (Fix 2), the mock silently resolved them to `undefined`, and every test calling
`save()` failed at runtime with `Cannot read properties of undefined`.

**Fix**: the mock factory now also exports the real enum const shapes (`StrategyStatus`,
`StrategyCategoryCode`) the code under test actually dereferences — a `jest.mock` factory
replaces the entire module, so every export the real code imports must be present in the mock,
not just the ones the test happened to call directly.

## Verification

| Check | Result |
|---|---|
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors |
| `pnpm lint` (all 8 packages) | ✅ 0 errors |
| `pnpm test` | ✅ 70/70 suites, 492/492 tests — including all 46 strategy-engine tests, with a real fixture bug (Fix 5) found and fixed by actually running them |
| `pnpm build` (`@rmsm/web`) | ✅ Builds successfully |

No domain layer file touched. No repository interface changed. No architecture redesigned —
every change in this pass is a persistence-boundary implementation fix, per this fix request's
own explicit scope.
