# AI-102 — Indicator Registry, Categories, and Roadmap

## Registry Design

`contracts/indicator-registry.interface.ts`'s `IndicatorRegistry` — registration, lookup, and
discovery by category, backed by an in-memory `Map<string, IndicatorMetadata>` in a real Phase
2 implementation (identical shape to AI-101's `ProviderRegistryService`). Every field an
indicator's metadata carries, per this phase's own explicit list (item 3):

| Field | Contract location |
|---|---|
| Identifier | `IndicatorMetadata.identifier` |
| Display name | `IndicatorMetadata.displayName` |
| Version | `IndicatorMetadata.version` (semver) |
| Category | `IndicatorMetadata.category` (`IndicatorCategory`) |
| Inputs | `IndicatorMetadata.inputs` (`IndicatorInputSpec[]`) |
| Outputs | `IndicatorMetadata.outputs` (`IndicatorOutputSpec[]`) |
| Dependencies | `IndicatorMetadata.dependencies` (other indicators' identifiers) |
| Supported timeframes | `IndicatorMetadata.supportedTimeframes` |
| Required lookback | `IndicatorMetadata.requiredLookback` |
| Incremental support | `IndicatorMetadata.supportsIncrementalCalculation` |

## Categories

The 8 named in item 4, as a plain string union (`IndicatorCategory`) — not a Prisma enum, since
AI-102 has no schema this phase (`AI102_PHASE1_ARCHITECTURE.md` Section 6):

`TREND` · `MOMENTUM` · `VOLATILITY` · `VOLUME` · `MARKET_STRUCTURE` · `PATTERN_RECOGNITION` ·
`CUSTOM` · `COMPOSITE`

`COMPOSITE` is a categorization label, not a structural distinction — per
`contracts/indicator.interface.ts`'s own comment, a composite indicator uses the exact same
`Indicator` interface as a leaf one; only its `metadata.dependencies` array (non-empty) and
`metadata.category` (`COMPOSITE`) actually mark it as such.

## Built-in Indicator Roadmap

Documented future support (item 5) — **no implementations this phase**, category-mapped so
Phase 2's own prioritization has a starting structure:

| Category | Indicators |
|---|---|
| Trend | Moving Averages (general), EMA, SMA, WMA, VWMA, HMA, ADX, SuperTrend, Ichimoku, Parabolic SAR |
| Momentum | MACD, RSI, Stochastic, CCI, ROC |
| Volatility | ATR, Bollinger Bands, Donchian, Keltner |
| Volume | VWAP, OBV |

21 named indicators (Moving Averages counted once as the general concept EMA/SMA/WMA/VWMA/HMA
each specialize) across 4 of the 8 categories — `MARKET_STRUCTURE` and `PATTERN_RECOGNITION`
are covered entirely by the proprietary indicators below, not by any built-in named this phase.

**Dependency relationships worth naming now** (informs Phase 2's own build order, since a
dependency should exist before what depends on it): MACD depends on two EMAs (this phase's own
worked example); Bollinger Bands typically depends on an SMA (its middle band) plus a standard
deviation calculation; SuperTrend typically depends on ATR. None of these are committed
decisions — a real Phase 2 implementation may find a different decomposition makes more sense
— but naming them now means Phase 2's build order isn't decided from a blank slate.

## Proprietary Indicators

Item 6's named set — RDSE, Market State Engine, Swing Detection, BOS (Break of Structure), CHOCH
(Change of Character), Liquidity, Order Blocks, Fair Value Gaps, Institutional Structure — are
architecturally **identical citizens** to the built-in list above: same `Indicator` interface,
same `IndicatorMetadata` shape, same registration mechanism
(`AI102_ENGINE_DESIGN.md`'s "Registration Mechanism" section), same category system
(`MARKET_STRUCTURE` and `PATTERN_RECOGNITION` are exactly where these belong).

This phase makes no decision about these indicators' actual calculation logic (out of scope —
"do not implement indicator calculations") or their relationships to each other (e.g., does
Order Blocks depend on Swing Detection? A real, open question for whoever implements these in
Phase 2+, not decided here). What this phase *does* commit to: nothing about the engine's
architecture treats "proprietary" as a special case anywhere — no `if (isProprietary)` branch
exists or is anticipated in any contract, matching the explicit rule this phase names.

## Discovery Example (Illustrative, Not Implemented)

```typescript
// Phase 2+ usage, not written this phase
const trendIndicators = registry.listByCategory("TREND");
// → every registered Moving-Average-family, ADX, SuperTrend, Ichimoku, Parabolic SAR entry,
//   built-in and proprietary alike, indistinguishable by this query alone
```

---

## Phase 2A Update — Real Implementation

Everything above described the design. Phase 2A built it for real — see
`docs/rmsm-ai/AI102_PHASE2A.md` for the full account, including two real bugs the test suite
itself caught (a registration-order dependency bug across category-file boundaries, and a
dropped `incrementalSupport` field during the `IndicatorMetadata`/`IndicatorDefinition` split).

**One structural change from what's described above**: `IndicatorMetadata` (this doc's Section
"Registry Design" table) is now narrower than originally shown — split into
`IndicatorDefinition` (the full, immutable, top-level object) and a narrower embedded
`IndicatorMetadata` (just `documentation`/`calculationType`/`deterministic`/`cacheable`/
`incrementalSupport`). `IndicatorRegistry.get()` now returns `IndicatorDefinition`, not
`IndicatorMetadata`, everywhere.

**All 28 named indicators are registered for real** — `IndicatorDefinitionRegistrarService`,
verified by a real end-to-end test (not mocked) confirming all 28 register successfully,
including RDSE at all 3 named versions (item 7's own worked example) and every real dependency
chain (SuperTrend→ATR, MACD→EMA, Keltner→ATR+EMA, Institutional Structure's 4-way proprietary
chain).

