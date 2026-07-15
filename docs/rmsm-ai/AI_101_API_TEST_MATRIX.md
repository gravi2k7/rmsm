# AI-101 — API Test Matrix

What's covered by real, genuinely-executed unit tests this phase, and what isn't — stated
plainly rather than implied by a passing test count alone.

## Covered (Controller Logic)

| Controller | What's tested | File |
|---|---|---|
| `MarketCandleController` | instrumentId-direct path, exchangeId+symbol resolution path, BadRequestException when neither is complete, instrumentId-takes-precedence when both given | `market-candle.controller.spec.ts` (4 cases) |
| `InstrumentController` | pagination metadata correctness, exchangeId deliberately NOT passed through (ADR-030), assetClass/status passed consistently to both search and count, multi-page hasNextPage math | `instrument.controller.spec.ts` (4 cases) |

## Covered (Supporting Service/Utility Logic)

| Unit | What's tested | File |
|---|---|---|
| `MarketDataAdminService` | health threshold boundary (ok at 20, degraded at 21), NotFoundError for missing config/job, metrics passthrough | `market-data-admin.service.spec.ts` (5 cases) |
| `pagination.util.ts` | default values, skip computation, page/pageSize clamping (both directions), hasNextPage/hasPreviousPage at boundaries, zero-total-count edge case | `pagination.util.spec.ts` (8 cases) |
| `MarketDataService` (Phase 4 additions) | `getExchange*` not-found handling, `searchExchanges` case-insensitive code/name match, blank-query returns-everything | `market-data.service.spec.ts` (new cases added to the existing Phase 3 file) |

## Not Covered This Phase, Named Rather Than Silently Absent

- **`ExchangeController`, `MarketQuoteController`, `MarketTickController`,
  `CorporateActionController`, `ProviderConfigController`, `SynchronizationController`** — no
  dedicated controller spec files. Every one of these controllers is a thin, single-line
  delegation to an already-tested service method (the service-layer logic they call is tested;
  the controller method itself has no branching logic worth a dedicated test — unlike
  `MarketCandleController`'s real resolution branch or `InstrumentController`'s pagination
  math, which do). A judgment call on where testing effort has real marginal value, not an
  oversight — flagged explicitly rather than implied covered by the overall pass count.
- **API integration tests** (full HTTP request/response cycle through Nest's test module,
  supertest-style) — not built this phase. Every test here is a unit test constructing the
  controller/service directly with mocked dependencies, the same standard this entire project
  has used since Module 002 (ADR-019's confirmed convention). A true integration-test harness
  (spinning up the Nest application context, hitting real HTTP routes) is a larger,
  separately-scoped addition, not attempted as a partial afterthought here.
- **Swagger/OpenAPI output validation** — the `@ApiProperty`/`@ApiOperation` annotations are
  present and typecheck-verified (a malformed decorator usage would fail `tsc`), but no test
  asserts the generated OpenAPI JSON's actual shape. Verifying Swagger generation itself needs
  the running application (`SwaggerModule.createDocument()`), out of reach for a pure unit test.
- **Real HTTP-level permission enforcement** — `PermissionsGuard`/`RequirePermissions` usage is
  present and typecheck-verified on every controller, but no test exercises the guard rejecting
  an unauthorized request end-to-end (that's an integration-test concern, per the point above).

## Total

Market-data module: 17 suites/125 tests before this phase → **21 suites/146 tests** after
(4 new spec files, 21 new test cases — including the exchange-related additions to the existing
`market-data.service.spec.ts`). Full project total: **36 suites/232 tests**, all genuinely
executed (confirmed via the runtime-functional stub technique, not just typechecked).
