# AI-101 — Operations Runbook

## Reading the Correlation ID (Phase 5)

Every request gets an `X-Request-Id` (generated fresh, or echoed back if the caller supplied
one). It appears in:
- The response header on every request, including failures.
- Every `HTTP` logger line (`LoggingInterceptor`): `[<id>] METHOD /path +Nms`.
- Every error response body's `meta.requestId` field.

**To debug a reported failure**: get the `X-Request-Id` from the caller (either they read it
from the response header, or it's in the error body they received), then `grep` server logs for
that id. This is the fastest path to the actual request's full log line, not just the error
message.

## Reading Provider Health

`GET /market-data/synchronizations/health` (requires `market-data.admin.manage`):

```json
{
  "status": "ok" | "degraded",
  "totalFailedImportCount": 0,
  "providers": [{ "type": "INTERNAL_FEED", "enabled": true, "circuitState": "closed" }],
  "database": "ok"
}
```

- **`status: degraded`** — triggered by any of: any provider's circuit open, more than 20
  all-time failed imports, or the direct database check failing. Check `providers` first (the
  most immediately actionable signal); `database: error` is the most urgent (nothing else
  works if this is failing).
- **`circuitState: open`** — that provider has failed 5 consecutive calls and is being
  short-circuited for 30 seconds (no further calls attempted) before one trial call is allowed
  through (`half_open`). This is expected, self-healing behavior for a transient provider
  outage — no manual intervention needed unless it stays open indefinitely (suggesting the
  provider is down for longer than a transient blip).
- **`totalFailedImportCount`** — an ALL-TIME count, not a rolling window (a real, named
  limitation — see ADR-030). A high number here could mean "there was a bad day last month and
  nobody's looked since," not necessarily an active problem. Cross-check against
  `GET /market-data/synchronizations/import-jobs?status=FAILED` for the actual recent jobs.

## Reading Metrics

`GET /market-data/synchronizations/metrics` (requires `market-data.admin.manage`) — a flat map,
in-memory, single-instance, reset on restart (not aggregated across multiple running
instances — a real limitation for a horizontally-scaled deployment). Key metric families:

| Prefix | Meaning |
|---|---|
| `provider.<type>.call_failed` | A provider call failed (any reason) |
| `provider.<type>.retry_attempted` / `.retry_succeeded` | Retry behavior |
| `provider.<type>.circuit_opened` | The circuit breaker opened for that provider |
| `import.<type>.candles_persisted` / `.candles_rejected` / `.failed` | Import job outcomes |
| `validation.candle.rejected` | Candles failing Phase 2C's OHLC/volume/timestamp rules |
| `validation.candle.duplicate` | Candles rejected as in-batch duplicates |

`validation.candle.rejected` climbing steadily suggests a provider data-quality problem;
`validation.candle.duplicate` climbing suggests a provider redelivering the same data — these
are genuinely different problems with different fixes, which is why they're tracked separately
(Phase 5's own reasoning, not incidental).

## Diagnosing a Failed Import Job

```
GET /market-data/synchronizations/import-jobs/:id
```

Returns `status`, `recordsProcessed`, `recordsFailed`, `errorSummary`. A `FAILED` job's
`errorSummary` is the exception message from wherever the import actually failed (provider call,
after retries exhausted; or an unexpected error during persistence). Cross-reference the audit
log (`market_data.historical_import.failed`, `AuditService`) for the same job id — it carries
`instrumentId`/`providerConfigId`/`reason` in its metadata.

## Known Operational Gap: No Reference-Data Write Path

**A fresh AI-101 deployment has no exchanges or instruments, and no REST endpoint to create
them.** Phase 4 built read-only endpoints only; nothing in AI-101 through Phase 5 exposes a way
to create an `Exchange`, `Instrument`, or `InstrumentAlias` over HTTP. Populating reference data
today requires either a direct database seed script (operator-written, not shipped) or waiting
for a future phase's write endpoints. Flagged here prominently because it's the single most
likely thing to confuse a first-time operator ("why does every list endpoint return empty").

## Circuit Breaker Reset

There is no manual "force close" endpoint — the circuit breaker self-heals via its cooldown
(30s) and half-open trial. If a provider is confirmed healthy again but the circuit seems stuck
(shouldn't happen given the state machine's own logic, but if observed), the only reset path is
an application restart (in-memory state, cleared on process restart) — a real, named limitation
of the single-instance design (ADR-031).
