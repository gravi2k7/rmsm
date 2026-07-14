# AI-101 — Phase 2B: Provider Infrastructure

Status: Complete — Awaiting Approval Before Phase 2C

Provider Registry, Factory, Resolver, 8 capability interfaces, provider metadata, and the one
real reference registration ("Custom Provider") that proves the whole pipeline actually works —
built to the letter of Phase 2B's scope: infrastructure only, no provider SDKs, no switch
statements anywhere.

## 1. The "No Switch Statements Throughout the Application" Requirement, Verified, Not Assumed

`ProviderFactoryService` dispatches via a `Map<MarketDataProviderType, builder>` — provider
selection is a Map lookup, never a branch on provider type. Confirmed by a direct scan after
building everything, not just claimed: **zero `switch` statements anywhere in
`apps/api/src/modules/market-data/`.** A future Binance/Polygon adapter registers its own
builder function at NestJS startup; the Factory, Registry, and Resolver never need editing to
add a new provider type.

## 2. The Organization-Configuration Tension, Resolved Explicitly

Phase 2B asks the Resolver to consider "organization configuration" — in apparent tension with
Phase 1's ADR-021 (AI-101 has no `organizationId` anywhere, by design). Resolved by making
organization preference a plain parameter
(`ProviderResolutionContext.organizationPreferredProviderType`), never a stored column. A
future organization-scoped module resolves its own preference and passes the *value* in — the
same as any other resolution hint. AI-101 gains zero new tenant coupling. Recorded as ADR-026,
flagged rather than either silently ignoring the requirement or silently violating ADR-021.

**Resolution precedence**, documented in the interface itself since "resolve by X, Y, Z" alone
doesn't say what wins when more than one applies: an explicit, still-valid organization
preference wins outright; otherwise the first enabled provider supporting the requested asset
class/market; otherwise a clear error — never a silent fallback to a provider nobody asked for.

## 3. Eight Provider Capability Interfaces

Three already existed from Phase 1 under different names — kept as-is rather than renamed for
naming-consistency alone, with the mapping documented directly in the composite
`MarketDataProvider` interface's own comments:

| Phase 2B name | Actual interface | Status |
|---|---|---|
| Historical Provider | `HistoricalDataClient` | Phase 1 |
| Quote Provider | `QuoteClient` | Phase 1 |
| Search Provider | `SymbolSearchClient` | Phase 1 |
| Tick Provider | `TickProvider` | **New this phase** |
| Corporate Action Provider | `CorporateActionProvider` | **New this phase** |
| Reference Data Provider | `ReferenceDataProvider` | **New this phase** |
| Health Provider | `HealthProvider` — reuses `ProviderOutageClassification` (Phase 1) rather than a second, parallel status vocabulary | **New this phase** |
| Instrument Provider | `InstrumentProvider` — single-symbol lookup, distinct from `ReferenceDataProvider.fetchInstrumentUniverse()`'s bulk catalog pull | **New this phase** |

## 4. Provider Metadata

`ProviderMetadata` (`interfaces/provider-metadata.interface.ts`) matches Phase 2B's example
list exactly: name, version, markets supported, asset classes, timeframes, and boolean support
flags for historical/quotes/ticks/streaming/corporate actions, plus rate limits and health
status. `ProviderRegistry.findByCapability()` and `getMetadata()` work entirely off this shape
— "does provider X support corporate actions for CRYPTO" is a metadata read, never a runtime
probe against the provider itself.

## 5. Provider Capability Matrix

| Provider | Historical | Quotes | Ticks | Streaming | Corporate Actions | Search |
|----------|:-----------:|:--------:|:------:|:----------:|:------------------:|:--------:|
| Polygon | ✓ (Phase 2C+) | ✓ (Phase 2C+) | ✓ (Phase 2C+) | ✗ (deferred, ADR-023) | ✓ (Phase 2C+) | ✓ (Phase 2C+) |
| Binance | ✓ (Phase 2C+) | ✓ (Phase 2C+) | ✓ (Phase 2C+) | ✗ (deferred, ADR-023) | ✗ | ✓ (Phase 2C+) |
| Twelve Data | ✓ (Phase 2C+) | ✓ (Phase 2C+) | ✗ | ✗ (deferred, ADR-023) | ✗ | ✓ (Phase 2C+) |
| Alpha Vantage | ✓ (Phase 2C+) | ✓ (Phase 2C+) | ✗ | ✗ (deferred, ADR-023) | ✓ (Phase 2C+) | ✓ (Phase 2C+) |
| MT5 | Later phase | Later phase | Later phase | Later phase (streaming-owning phase, ADR-023) | ✗ | ✗ |
| TradingView | Later phase | Later phase | Later phase | Later phase (streaming-owning phase, ADR-023) | ✗ | ✗ |
| Interactive Brokers | Later phase | Later phase | Later phase | Later phase (streaming-owning phase, ADR-023) | Later phase | Later phase |
| **Internal Feed (Custom Provider)** | **✓ (real this phase)** | **✓ (real this phase)** | **✓ (real this phase)** | ✗ | ✗ | ✓ (synthetic, real this phase) |

**Only the last row is actually implemented this phase.** Every other row states the *design
intent* this module's interfaces are built to support — no Binance/Polygon/etc. code exists yet
("no provider SDK implementations," Phase 2B's explicit scope). This table is not a claim of
what's built; it's the capability plan the infrastructure is proven to accommodate.

## 6. Why `InternalFeedProvider` Exists, and Why It Isn't a Placeholder

Phase 2B's own quality bar prohibits placeholders and fake production paths, but also
explicitly defers all real provider SDK work. The resolution: register exactly one real,
working, deterministic provider — "Custom Provider" mapped to `MarketDataProviderType.INTERNAL_FEED`
(a type this module's own schema already named, Phase 1) — with no external network calls,
matching the same legitimacy Module 004's `MockProvider` established: genuinely functional code
an operator could actually register and use for synthetic/internal data, not a stand-in
pretending to be something else. Candle/tick/quote generation is deterministic (hash-seeded by
symbol + time, not `Math.random()`), making it reproducible in tests, not just "doesn't crash."
This is the one thing this phase registers with the Registry/Factory to prove the full
registration → lookup → discovery → resolution pipeline genuinely works end to end.

## 7. Dependency Injection

`ProviderRegistryService`, `ProviderFactoryService`, `ProviderResolverService` are all
`@Injectable()` NestJS services, wired into `MarketDataModule`. `ProviderRegistrarService`
(`OnModuleInit`) performs the one-time startup registration — the **only** place a concrete
provider type is named in application wiring; everywhere else works through the
`MarketDataProvider` interface alone, per Phase 2B's explicit "no service should instantiate
providers directly" rule.

## 8. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors — 2 real errors found and fixed during verification (a type-widening issue in `InternalFeedProvider`'s synthetic search result, and a test-mock type mismatch in the resolver spec) |
| Switch-statement scan | ✅ zero, confirmed by direct grep across the entire module |
| New Registry/Factory/Resolver tests (15 cases) | ✅ Genuinely executed and passing |
| Full suite (runtime-stub verified) | ✅ **20/20 suites, 111/111 tests** |
| TODO/placeholder/bare-`any` scan | ✅ none found |

## 9. What's Deferred to Phase 2C

Normalization & Validation — implementations of Phase 1's data-quality contracts
(`GapDetector`, `DuplicateDetector`, etc.) and the layer that turns a provider's raw payload
into `NormalizedCandle`/`NormalizedQuote`/etc., resolving provider symbols through
`InstrumentAlias`. Per your instruction: **stopping here, not continuing into 2C.**

---

**Awaiting your review before Phase 2C.**
