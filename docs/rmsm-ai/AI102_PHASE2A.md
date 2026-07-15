# AI-102 — Phase 2A: Indicator Registry & Definitions

Status: Complete — Awaiting Architecture Review Before Phase 2B

The Indicator Registry, real for the first time — registration, lookup, version management,
validation, and discovery, backed by 28 real indicator definitions (19 built-in + 9
proprietary). No calculation logic, no services beyond registration plumbing, no repositories,
no controllers, no caching, no dependency execution — exactly this phase's scope.

## A Real Bug, Caught By the Test Suite Itself, Not By Inspection

The single most important thing this phase's own verification found: my first
`IndicatorDefinitionRegistrarService` registered whole category files in file order (volatility,
then trend, then momentum, then volume, then proprietary), on the assumption that category
groupings and dependency order would line up. **They don't.** `keltner_channel` (filed under
Volatility) depends on `ema` (filed under Trend, registered later in that first ordering) —
while `supertrend` (filed under Trend) depends on `atr` (filed under Volatility). Two
indicators in *different* category files, each needing something from the *other* file, with
no actual cycle between the underlying indicators themselves (`atr` and `ema` both have zero
dependencies of their own) — just a wrong assumption that file boundaries and dependency order
would coincide.

This was caught by `indicator-definition-registrar.service.spec.ts`'s own end-to-end test —
which calls the *real* registrar against a *real* registry, not a mocked stand-in — failing
with a genuine `InvalidDependencyError` the moment the test suite ran. A doc comment claiming
the ordering was correct did not catch this; running the real code against a real registry did.
Fixed by registering in true dependency order explicitly (every zero-dependency definition
first, then the 3 built-in indicators with a real dependency, then proprietary in its own
already-correct internal order), verified by re-running the exact same test that caught the
original bug.

## Architectural Decisions

### `IndicatorMetadata` split into `IndicatorDefinition` + `IndicatorMetadata`
Phase 1 had one `IndicatorMetadata` interface holding every field. This phase's own spec lists
two contracts with overlapping-but-different field sets: "Indicator Definition" (item 2 —
identifier, displayName, version, description, category, inputs, outputs, defaultParameters,
supportedTimeframes, minimumLookback, dependencies, tags, author, stabilityLevel) and
"Indicator Metadata" (item 6 — version, author, documentation, calculationType, deterministic,
incrementalSupport, cacheable, dependencies). Resolved by making `IndicatorDefinition` the full,
top-level immutable object (item 2's fields, directly), with `IndicatorMetadata` narrowed to
hold only the fields not already structural on `IndicatorDefinition` (`documentation`,
`calculationType`, `deterministic`, `cacheable`, `incrementalSupport`) — embedded as
`IndicatorDefinition.metadata`. One fact, one place, not the same field declared twice under
two names. Every Phase 1 file referencing the old shape was updated to match — not left stale.

**A second real bug, caught while writing `RegistryQueryService`, not by a separate review
pass**: the first draft of this restructuring dropped `incrementalSupport` entirely during the
split — item 6 explicitly names it, and it was simply missing from the narrowed
`IndicatorMetadata`. Caught while implementing the capability-filter discovery query (which
needed to check exactly this field), fixed by adding it back with an explicit note connecting
it to Phase 1's original `supportsIncrementalCalculation` field it replaces.

### Immutability enforced structurally, not by convention
This phase's own explicit architectural improvement — "Indicator Definition → never changes at
runtime" — is enforced by `IndicatorRegistryService.register()` calling a real recursive
`Object.freeze()` on every definition before storing it, verified by a test that actually
attempts a mutation and confirms it's rejected (not just a `readonly` TypeScript hint a caller
could bypass with a type assertion).

### `RegistryValidator` is a distinct hierarchy from Phase 1's `IndicatorValidator`
Two different questions: is a *definition* well-formed before it's ever registered
(`RegistryValidator`, this phase, registration-time) vs. is a *request* valid against an
already-registered definition (`IndicatorValidator`, Phase 1, execution-time). Kept as two
separate interfaces with two separate error hierarchies (`RegistryValidationError` vs.
`IndicatorValidationError`) rather than one overloaded validator — conflating them would make a
catch-block unable to tell which phase of an indicator's lifecycle actually failed.

### `IndicatorInstance` is a plain class, not a NestJS provider
Definitions are singletons (one "ema" definition, registered once); instances are values (many
`IndicatorInstance` objects can exist for the same definition — EMA(20), EMA(50), EMA(200), this
phase's own worked example). A plain, `new`-constructed class matches that shape; a DI-managed
singleton would not (there is no single "the EMA instance" to inject).

## Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors — 1 real type-strictness error found and fixed (a `Partial<Record<...>>` spread allowing `undefined` into a non-optional `Record` type) |
| New tests (48 cases across 5 files) | ✅ Genuinely executed — including the real registration-order bug, caught and fixed during this same verification pass, not before it |
| Full suite | ✅ 42/42 suites, 295/295 tests |
| TODO/placeholder/bare-`any` scan | ✅ none found |

## What's Deferred to Phase 2B

Indicator calculation logic (`Indicator.calculate()` implementations), the dependency graph's
real execution (topological sort, cycle detection at execution time — this phase only checks
"does the named dependency exist," not "is there a cycle across the whole graph"), the
computation engine, caching — exactly this phase's own named exclusions.

---

**Awaiting your review before Phase 2B.**
