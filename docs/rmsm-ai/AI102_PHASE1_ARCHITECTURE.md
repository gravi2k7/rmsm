# AI-102 — Indicator Engine
## Phase 1: Architecture & Engineering Specification

Status: Complete — Awaiting Architecture Review Before Phase 2

Per this phase's explicit scope, this document (and its companions) delivers architecture and
specification only. **No indicator calculation, controller, repository, service, or provider
integration exists yet.** Every `.ts` file this phase delivers is a type/interface declaration
or a DTO — the identical Phase 1 discipline every prior module (EP-002 through EP-005) and
AI-101 itself applied at their own Phase 1.

## 1. Where AI-102 Sits

```
Enterprise Platform → AI-101 Market Data → AI-102 Indicator Engine → AI-103 Strategy Engine → ...
```

AI-102 consumes AI-101's `MarketDataService`/`MarketDataAdminService` exclusively — never a
repository, never a provider adapter directly, the same "no future module bypasses the service
layer" rule AI-101 itself enforced on AI-102 and every later module. No AI-102 file this phase
imports anything from `market-data/repositories/` or `market-data/providers/` — only
`market-data/interfaces/models/` (AI-101's Phase 2A domain models, ADR-025), reused directly
rather than redeclared, the same precedent AI-101 itself set for reusing `@rmsm/database`
enums.

## 2. Reused, Not Recreated

- **AI-101's `MarketCandleModel`** — `IndicatorContext.candles` (`contracts/indicator-context.interface.ts`)
  uses this domain model directly, never a redeclared shape.
- **AI-101's `CandleInterval`** — `IndicatorTimeframe` (`contracts/timeframe.ts`) is a direct
  type alias, not a parallel enum. See Section 5 for the real gap this reuse surfaced.
- **The registry+factory pattern** — this project's fourth-and-fifth application now (EP-002,
  EP-004, EP-005, AI-101's own provider infrastructure, and now `IndicatorRegistry`/
  `IndicatorFactory`), not a new architecture invented for indicators.
- **The pure-function normalization/validation discipline** — `Indicator.calculate()` and
  `IndicatorContext` mirror AI-101 Phase 2C's normalizer/validator purity rule
  (deterministic, no side effects, no database/network access) exactly, applied to indicator
  computation instead of market-data normalization.

## 3. Folder Structure

```
apps/api/src/modules/indicator-engine/
├── contracts/          ← populated (14 files): every interface named in item 13, plus
│                          supporting types (category, timeframe, dependency graph,
│                          incremental calculation, validation, cache, computation engine)
├── dto/                 ← populated (1 file so far): IndicatorExecutionRequestDto
├── indicators/           ← deferred (Phase 2+ — built-in/proprietary indicator implementations)
├── registry/             ← deferred (Phase 2+ — real IndicatorRegistry implementation)
├── engine/                ← deferred (Phase 2+ — real IndicatorEngine implementation)
├── cache/                  ← deferred (Phase 2+ — memory + future distributed cache implementations)
├── validation/              ← deferred (Phase 2+ — real IndicatorValidator implementation)
├── dependency-graph/          ← deferred (Phase 2+ — real DependencyGraph implementation)
├── computation/                 ← deferred (Phase 2+ — real ComputationScheduler implementation)
└── __tests__/                    ← empty this phase (nothing to test yet — pure type
                                     declarations have no runtime behavior; the first real
                                     tests arrive with Phase 2's first real implementation)
```

Every deferred folder carries a README explaining why it's empty, matching AI-101's own
precedent — an empty directory with a note is more honest than placeholder implementation code.

## 4. Core Principles, Enforced Structurally

This phase's "Core Principles" section (deterministic, reusable, stateless where possible,
thread-safe, provider-independent, market-independent) isn't just documentation — it's
structurally enforced by the contract shapes themselves:

- **`Indicator.calculate(context: IndicatorContext): IndicatorResult`** takes no dependency on
  AI-101's services, no database handle, no provider reference — only a plain, already-resolved
  context object. An indicator implementation *cannot* reach into AI-101 directly even if it
  wanted to; the interface gives it nothing to reach with.
- **Thread-safety** follows from statelessness: a `calculate()` implementation with no mutable
  instance state and no shared external state is safe to call concurrently by construction, not
  by a synchronization mechanism bolted on top.
- **Provider/market independence**: `IndicatorContext.candles` is AI-101's own normalized
  `MarketCandleModel` — an indicator never sees which provider (Binance, Polygon, `InternalFeedProvider`)
  originally supplied the data, only the canonical, already-normalized values.

## 5. The One Real Gap This Phase Found (Not Silently Glossed Over)

Item 8's multi-timeframe list names 1m, 2m, 3m, 4m, 5m, 15m, 30m, 1H, 4H, 1D, 1W, Monthly.
AI-101's `CandleInterval` — checked directly against `schema.prisma`, not assumed — has no
2-, 3-, or 4-minute value. **AI-102 cannot support those three timeframes today**, because
there is no canonical AI-101 data to compute them from, and "no module may bypass AI-101"
means AI-102 has no legitimate way to source that data independently.

`contracts/timeframe.ts` documents this with a machine-readable status map
(`REQUESTED_TIMEFRAMES_STATUS`), not just a prose comment, and names two possible resolutions
for Phase 2 to decide between (a genuinely open question, not decided here): AI-101 gaining
new `CandleInterval` values (the more architecturally correct fix — real, storable, correctable
2m/3m/4m candles), or AI-102 gaining a synthetic-timeframe aggregation capability (building a 3m
candle from three 1m candles on the fly — plausible, but creates real tension with "AI-101 is
the single source of truth," since those derived candles would be owned and computed by AI-102,
never stored or corrected by AI-101).

## 6. Database Impact — No Schema This Phase, Justified

**Decision: AI-102 requires no Prisma schema changes.**

Reasoning, by direct analogy to AI-101's own established precedent:

1. **Indicator definitions are code, not data.** `IndicatorRegistry.register()` takes an
   `IndicatorMetadata` object constructed by a real TypeScript class at application startup —
   the identical shape as AI-101 Phase 2B's `MarketDataProvider` adapters, registered via
   `ProviderRegistryService.register()`/`ProviderFactoryService.registerBuilder()`, never
   stored as database rows. An indicator implementation is a deployable code artifact; nothing
   about "which indicators exist" needs to survive independently of the code that defines them.
2. **Computed indicator values are a caching concern, explicitly deferred.** Item 12 itself says
   "do not implement caching" — and a cache (whether in-memory or a future distributed one) is
   architecturally a *cache*, not a system of record, regardless of whether it happens to be
   backed by Redis or Postgres. `contracts/cache.interface.ts` designs this layer without
   committing to a specific backing store; that decision belongs to whichever future phase
   actually implements caching, not this one.
3. **Indicator results are always re-derivable.** Given the same AI-101 candles and the same
   parameters, `Indicator.calculate()` is deterministic by contract — nothing is ever lost by
   not persisting a result, only recomputation cost, which is exactly what the (deferred) cache
   layer exists to amortize.
4. **No user-facing custom-indicator authoring exists yet.** "Custom Indicators" (item 4) is a
   *category* the engine must architecturally support, not a feature with a UI or a data-entry
   mechanism this phase. If a future phase adds a "build your own indicator formula" feature,
   *that* feature would need its own schema (the formula/definition a user typed, not indicator
   *results*) — a real, named future need, not solved or assumed here.

If Phase 2 or later finds a genuine need for persistence (e.g., a custom-indicator authoring UI,
or a decision that computed results need durability beyond a cache's own semantics), that's a
new, explicit decision for that phase to make and justify — not implied by this one.

## 7. Performance Goals

Measurable targets, not aspirational statements — item 15's own explicit ask, and "avoid
premature optimization... define measurable goals" taken literally:

| Scale | Target | Basis |
|---|---|---|
| 100 indicators (single instrument) | < 500ms total, cold (no cache) | A dashboard loading a full indicator panel for one chart — a real, common UI pattern this needs to feel instant for |
| 1,000 indicators (single instrument, e.g. many parameter variants of a few indicator types) | < 3s total, cold | A strategy backtesting a parameter sweep — tolerates being slower than a live dashboard, but not minutes |
| 10,000 indicators (large watchlist, e.g. 100 instruments × 100 indicators) | < 30s total, cold, with `executeBatch`'s parallelization | A scanner (future AI-104) sweeping a large universe — the scenario `ComputationScheduler.buildPlan`'s `parallelizableGroups` exists specifically to make tractable |
| Multi-timeframe execution (one indicator, all 9 currently-supported AI-101 timeframes) | < 1s total | A multi-timeframe confluence check — one instrument, all supported granularities, at once |

These are **targets to validate in Phase 2+**, not benchmarks already measured — no
implementation exists yet to benchmark. Stated as goals now so Phase 2's own implementation has
something concrete to design against and Phase 5-equivalent hardening has something concrete to
verify later, the same discipline AI-101's own Phase 5 performance review applied.

## 8. Testing Strategy (Designed, Not Implemented)

- **Unit tests**: per-indicator, once real implementations exist — `Indicator.calculate()`'s
  purity makes this the easiest possible thing to test (pure input → pure output, no mocking
  needed at all, unlike almost everything else in this project).
- **Golden dataset tests**: a fixed, checked-in candle series with independently-verified
  expected indicator outputs (e.g., cross-checked against a reference implementation or
  published worked example) — catches a calculation bug a hand-written unit test with
  convenient round numbers might not.
- **Deterministic replay**: the same `IndicatorExecutionRequest` run twice must produce
  byte-identical `IndicatorResult`s — a direct test of the determinism principle, not just an
  assumption.
- **Performance benchmarks**: against Section 7's own targets, once there's something to
  measure.
- **Dependency graph validation**: `DependencyGraph.detectCycle()` tested against both a valid
  multi-level dependency chain (this phase's own MACD→EMA example) and a deliberately
  constructed cycle, confirming it's actually caught rather than silently producing a bad
  execution order.

## 9. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors, first attempt |
| TODO/placeholder/bare-`any` scan | ✅ none found |

---

**Awaiting your review before Phase 2.** See `AI102_PHASE2_PLAN.md` for what Phase 2 will build
once approved.
