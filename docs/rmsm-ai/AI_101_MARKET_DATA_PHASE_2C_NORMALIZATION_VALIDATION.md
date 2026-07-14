# AI-101 — Phase 2C: Normalization & Validation

Status: Complete — Awaiting Architecture Review Before Phase 3

## Phase Completion Report

### What Was Implemented

**10 normalizers** (`utils/normalizers/`), each a pure, deterministic, side-effect-free
function — no database access, no network access, verified by direct code review (every
function's only inputs are its parameters, only output is its return value):

| Normalizer | Handles |
|---|---|
| `decimal.normalizer.ts` | Precision-safe decimal strings (never routes through float arithmetic for anything stored) |
| `time.normalizer.ts` | UTC timestamp parsing (epoch seconds/millis/ISO) + provider-timezone-to-UTC conversion |
| `symbol.normalizer.ts` | Canonical symbol format (`EXCHANGE:SYMBOL`, `BASE/QUOTE`, plain) |
| `candle.normalizer.ts` | Raw candle payload → `NormalizedCandle` |
| `quote.normalizer.ts` | Raw quote payload → `NormalizedQuote` |
| `tick.normalizer.ts` | Raw tick payload → `NormalizedTick` |
| `exchange.normalizer.ts` | Raw exchange payload → `NormalizedExchangeInfo` |
| `instrument.normalizer.ts` | Raw instrument payload → `NormalizedInstrumentReference` |
| `instrument-alias.normalizer.ts` | Provider symbol format canonicalization for alias records |
| `corporate-action.normalizer.ts` | Raw corporate action payload → `NormalizedCorporateAction` |
| `trading-session.normalizer.ts` | Raw session payload → validated HH:mm session record |
| `trading-calendar-metadata.normalizer.ts` | Calendar *coverage* metadata (not actual holidays) |
| `provider-metadata.normalizer.ts` | Provider capability metadata, defaulted and validated |

**Validation** (`validation/`), the distinct second pass applied to already-normalized data:
- `candle.validator.ts` — every OHLC rule named in the prompt (High≥Open, High≥Close, Low≤Open,
  Low≤Close, High≥Low, non-negative volume, valid timeframe, valid timestamp)
- `tick.validator.ts` — timestamp, positive price, non-negative size
- `quote.validator.ts` — timestamp, positive prices where present, mid/spread computation,
  crossed-market detection
- `reference-data.validator.ts` — required fields, in-batch uniqueness, ISIN/CUSIP format
- `provider-data.validator.ts` — capability consistency, capability-requirement checks,
  configuration format validation
- `duplicate-detector.ts` — reusable candle/tick/quote duplicate detection (in-batch only)
- `data-quality-rules.ts` — **the first real implementations of Phase 1's `InvalidValueDetector`/
  `OutOfOrderDetector` contracts** (declared as interfaces then, deferred "to a later phase" —
  this is that phase), plus 6 standalone rule-check functions covering the rest of the prompt's
  named list (missing fields, future/negative timestamp, invalid timeframe, invalid symbol,
  provider inconsistency)

**Error model** (`validation/errors/market-data-validation.error.ts`) — all 8 named error types
(`InvalidTimestamp`, `InvalidOHLC`, `InvalidVolume`, `DuplicateRecord`, `InvalidProviderPayload`,
`InvalidSymbol`, `InvalidPrecision`, `InvalidTimezone`), one shared abstract base, zero
provider-specific subclasses anywhere.

**44 new unit tests**, all genuinely executed and passing — and notably, since every one of
these files is pure logic with no runtime `@rmsm/database` dependency, they ran
**unconditionally**, without needing the mocked-database or runtime-stub techniques this
project has relied on since Phase 2a/2c of prior modules.

### What Was Intentionally Deferred

Exactly what the prompt named: business services, synchronization workers, REST controllers,
GraphQL, WebSockets, FIX, MT5, TradingView, provider SDKs, Redis, cache, holiday calendars,
corporate action *processing* (as opposed to corporate action *normalization*, which is built).
Also not built: `GapDetector` (Phase 1's third detection contract) — real gap detection needs
to know what data *should* exist, which requires repository access and trading-session
awareness this side-effect-free layer deliberately doesn't have; correctly left unimplemented,
not an oversight.

### Architectural Decisions

- **ADR-027**: the new error hierarchy is `MarketDataValidationError`, not `ValidationError` —
  `@rmsm/shared` already owns that name for an HTTP-layer concern this hierarchy isn't.
- **ADR-028**: concatenated symbol pairs (`"BTCUSDT"`) are never split by the normalizer — a
  permanent boundary, not a follow-up. `InstrumentAlias` (Phase 2A) is the real mechanism for
  resolving provider-specific symbol ambiguity.
- **Normalizer/Validator separation, applied consistently**: every normalizer only canonicalizes
  *format* (throwing only for structurally malformed input — unparseable timestamp, non-decimal
  string); every validator checks *business-rule correctness* on already-normalized data
  (OHLC relationships, crossed markets). This wasn't stated as an explicit rule in the prompt but
  is the natural reading of "Normalizers" and "Validation" being listed as separate, numbered
  deliverables — applied uniformly across all 10+7 files rather than being negotiated file by
  file.

### Assumptions

- A provider's `time`/`sourceTimestamp` fields may arrive as epoch seconds, epoch millis, or
  ISO strings; distinguished by magnitude (values under 10^11 treated as seconds) — a heuristic
  every real provider's actual behavior matches, not a guarantee for arbitrary input.
- 60 seconds of clock-skew tolerance on "is this timestamp in the future" — a judgment call, not
  a spec'd value.
- Decimal scale limits (10 fractional digits for prices, 10 for volumes) are placeholders
  matching the schema's actual `@db.Decimal` precision from Phase 1 — not independently chosen.

### Known Limitations

- ISIN/CUSIP validation is format-only (regex), not checksum verification — a real ISIN
  check-digit algorithm exists but was out of scope for this phase's normalizer.
- `checkProviderInconsistency` only compares currency across same-symbol entries in one batch —
  a narrow, real check, not general cross-provider reconciliation (which needs `InstrumentAlias`
  resolution, i.e., database access).
- Epoch-seconds-vs-millis disambiguation by magnitude would misclassify a genuine pre-1973
  millisecond timestamp as seconds — not a realistic concern for market data, flagged anyway.

### Validation Checklist

- [x] Every normalizer is deterministic (same input → same output) — verified by an explicit
      test (`candle.normalizer.spec.ts`'s "is deterministic" case)
- [x] No normalizer or validator touches a database, network, or the filesystem — verified by
      code review; none imports `@rmsm/database`'s `prisma` singleton, `fetch`, or `fs`
- [x] All 8 named error types exist, share one base class, and are provider-agnostic
- [x] Candle validation covers every rule the prompt named, individually tested
- [x] Duplicate detection supports candles, ticks, and quotes with no database implementation
- [x] Zero TODOs, placeholders, or bare `any` (scanned directly, not assumed)
- [x] Zero plain `Error` throws anywhere in this phase's code (scanned directly) — every error
      goes through the standardized model

### Inputs Required for Phase 3

Per the prompt's own instruction to wait for architecture review — these are genuine open
questions, not implementation blockers:
1. Should Phase 3 implement `GapDetector` for real (requires deciding how/whether the
   normalization layer gets read-only repository access, a real architectural boundary
   question), or does gap detection belong entirely to a future synchronization phase?
2. Is a real ISIN checksum validator worth adding, or does format-only validation remain
   sufficient?
3. Confirmation that "Phase 3" in this project's numbering is the deferred business-services/
   synchronization phase named in this prompt's own "Deferred" list — not renumbered.

## Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors — 2 real `noUncheckedIndexedAccess` errors found and fixed during verification (array-destructuring and array-index patterns this phase's code introduced) |
| New tests (44 cases across 8 files) | ✅ Genuinely executed and passing — unconditionally, no database mock needed, since every file is pure logic |
| Full suite | ✅ 155/155 |
| TODO/placeholder/bare-`any`/plain-`Error` scan | ✅ none found |

---

**Awaiting architecture review before Phase 3, per your explicit instruction — not proceeding
further.**
