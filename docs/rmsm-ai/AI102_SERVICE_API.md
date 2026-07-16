# AI-102 — Service API

The complete, real, callable surface `IndicatorEngineServiceImpl` exposes — every future
consumer's own reference for what it can actually call.

## `execute(request: ExecuteIndicatorRequest): Promise<IndicatorExecutionResponse>`

```typescript
interface ExecuteIndicatorRequest {
  indicatorIdentifier: string;
  version?: string;                    // omitted = latest registered version
  instrumentId: string;
  timeframe: string;                   // one of AI-101's CandleInterval values
  parameters: Record<string, number | string | boolean>;
  calculationMode: CalculationMode;    // FULL_RECALCULATION | INCREMENTAL | HISTORICAL_REPLAY
                                        // | LIVE_TICK | LIVE_BAR | BACKTEST
  from: string;                        // ISO 8601
  to: string;                          // ISO 8601
  executionOptions?: { timeoutMs?: number; cancellable?: boolean };
}
```

Walks the full real pipeline: resolves the indicator's definition, builds and validates a
dependency graph, generates an execution plan, then executes every step in that plan's
dependency-respecting order — feeding each completed dependency's own result into whatever
later step actually needs it. **Genuinely executes a dependency-bearing indicator end to end**
(verified by this phase's own test using a real MACD-shaped indicator depending on a real EMA),
provided real `Indicator.calculate()` implementations exist for every step — they still don't
for any of AI-101's 28 registered definitions, so every real call through this method today
fails at the calculation step, honestly, with a clear message naming exactly which indicator has
no implementation yet.

```typescript
interface IndicatorExecutionResponse {
  summary: {
    executionId: string;
    indicatorIdentifier: string;
    status: "COMPLETED" | "FAILED" | "CANCELLED";
    durationMs: number;
    stepCount: number;                 // how many steps (root + dependencies) actually ran
  };
  result?: ExecutionResult;            // the root's own result — present only when COMPLETED
  stepResults: Record<string, ExecutionResult>;  // every step's own result, even on partial failure
  errors: string[];
}
```

## `query(request: QueryIndicatorRequest): IndicatorListResponse`

```typescript
interface QueryIndicatorRequest {
  category?: IndicatorCategory;
  tags?: string[];
  identifier?: string;
  version?: string;
}
```

Registry-only discovery — never touches AI-101, never plans or executes anything.

## `lookup(identifier: string, version?: string): IndicatorMetadataResponse`

The full `IndicatorDefinition` for one indicator — `{ definition: IndicatorDefinition }`. Throws
`IndicatorServiceException` for an unregistered identifier/version.

## `validate(request: IndicatorValidationRequest): ValidationResponse`

```typescript
interface IndicatorValidationRequest {
  indicatorIdentifier: string;
  version?: string;
  parameters: Record<string, number | string | boolean>;
  timeframe: string;
}
```

Returns `{ valid: boolean, errors: string[] }` — every problem found, not just the first (a
deliberate difference from this project's own registration-time validators, which fail fast;
see `AI102_PHASE3_SERVICES.md` for why). Checks existence, metadata, parameters, timeframe
support, and dependency availability, in that order, short-circuiting only when the indicator
itself doesn't exist (every other check needs a real definition to check against).

## Error Handling

Every method can throw a `ServiceError` subclass (`contracts/service.errors.ts`):
`IndicatorServiceException` (query/lookup failures), `ExecutionServiceException` (planning
failures — a graph or plan couldn't be built), `ValidationServiceException` (reserved for a
future validation-layer failure distinct from a request simply being invalid, which
`validate()` reports via its own return value, not a throw), `RegistryServiceException` and
`PlannerServiceException` (reserved wrappers for lower-layer failures surfaced through this
one, per those classes' own comments).

`execute()` itself never throws for a FAILED or CANCELLED execution outcome — that's reported
via `IndicatorExecutionResponse.summary.status` and `.errors`, a normal, expected return value.
It only throws when planning itself fails before any step could even be attempted (an
unregistered root indicator, or a definition that fails graph validation).

## What This API Deliberately Does Not Expose

Per item 6's own explicit rule, nothing below is reachable through `IndicatorEngineServiceImpl`
— a future module has no way to bypass this facade even if it wanted to, since these classes are
simply never exported for that purpose (`indicator-engine.module.ts`'s own `exports` array
still exports them for this project's own internal testing/composition needs, not as an invitation):

- `IndicatorRegistryService` (Phase 2A) — registration/version management directly
- `DependencyGraphBuilderService`/`GraphValidatorService` (Phase 2C) — raw graph construction
- `ExecutionPlannerService` (Phase 2C) — raw plan generation
- `ComputationEngineService` (Phase 2B) — single-step execution directly, bypassing planning

---

## Phase 4 Update — Now Reachable Over REST

Every method on this page is now callable over HTTP through `IndicatorController` — see
`docs/rmsm-ai/AI102_REST_API.md` for the endpoint catalog and `AI102_PHASE4.md` for the error-
mapping and architecture decisions this phase made. The service-layer contract itself is
unchanged; this is a new transport, not a new API.


## Phase 5 Update — Structured Logging & Correlation

`ExecuteIndicatorRequest` gained an optional `requestId` field — the platform's own correlation
id (AI-101 Phase 5's `RequestIdMiddleware`), threaded from `IndicatorController`'s own `@Req()`
access through to `IndicatorExecutionServiceImpl`'s real structured log line on every execution
(`requestId=... executionId=... graphId=... indicatorId=... durationMs=... status=...`), on
both success and failure — a real gap the original implementation had (only failures were
logged at all). The service contract itself is otherwise unchanged this phase.
