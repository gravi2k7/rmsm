# FIP-001 Domain 8 — Time-Series Storage: TimescaleDB Readiness

## Scope and constraint

The prompt is explicit: **do not replace PostgreSQL**, and prepare the architecture so **TimescaleDB can be enabled later without breaking existing Prisma repositories**. This document is that preparation — a concrete plan plus the specific schema/repository properties that already make the migration safe — not an actual TimescaleDB installation (there is no infrastructure change in this deliverable; `market_candles` and the other time-series tables remain ordinary PostgreSQL tables today).

## Why this is safe to defer

TimescaleDB's `hypertable` mechanism converts an existing PostgreSQL table into a partitioned one via `SELECT create_hypertable('market_candles', 'event_time')` — a single administrative statement run against an *existing* table, not a schema rewrite. Prisma talks to hypertables exactly like ordinary tables (the partitioning is transparent below the SQL interface Prisma generates), so every repository in this module (`MarketCandleRepository`, `MarketTickRepository`, `MarketQuoteRepository`, `CandleQualityMetadataRepository`, `DerivedIndicatorSnapshotRepository`, `MarketDataAiSnapshotRepository`) continues to work unmodified the day this is enabled.

## What already makes this module hypertable-ready

- **Every time-series table already has its own dedicated, monotonically-relevant `eventTime`/`computedAt`/`detectedAt` timestamp column** (never relying solely on `id` or `createdAt` for time-based queries) — the column TimescaleDB's `create_hypertable()` needs as its partitioning key already exists on `market_candles`, `market_ticks`, `market_quotes`, `derived_indicator_snapshots`, and `market_data_ai_snapshots`.
- **No time-series table uses a composite/compound primary key that embeds business logic incompatible with hypertable partitioning** — every one uses a simple `id` primary key plus separate unique/composite indexes for lookups, which hypertables support natively.
- **This phase's own new indexes** (`derived_indicator_snapshots_instrumentId_interval_eventTim_idx`, `market_data_ai_snapshots_instrumentId_interval_eventTime_idx`, `candle_quality_metadata_validationStatus_idx`) are all already time-column-inclusive, matching the query shape TimescaleDB's chunk exclusion optimizes for.
- **`MarketCandle.eventTime` has no default `NOW()`** — every row's time value is caller-supplied (the actual market event time), which is required for correct hypertable partitioning (a `NOW()`-defaulted timestamp would partition rows by insert time instead of business time).

## Migration plan (future work, not this phase)

1. Install the TimescaleDB extension on the target PostgreSQL instance (`CREATE EXTENSION IF NOT EXISTS timescaledb;`) — an infrastructure/ops change, not a schema change.
2. Convert `market_candles`, `market_ticks`, and `market_quotes` (the genuinely high-volume, append-mostly tables) to hypertables via `create_hypertable()`, partitioned on `eventTime`, with a chunk interval sized to the expected daily/weekly ingestion volume (a capacity-planning decision to make against real production volume, not guessable here).
3. **Compression strategy**: enable native TimescaleDB compression (`ALTER TABLE ... SET (timescaledb.compress)`) on chunks older than a rolling window (e.g. 7 days) — candle data older than a week is rarely mutated (only `MarketCandle.isCorrection`/`supersedesId` ever revises a historical row, an intentionally rare operation), making it a strong compression candidate.
4. **Retention strategy**: a `add_retention_policy()` job dropping raw tick-level data (`market_ticks`) past a defined horizon (e.g. 90 days) once downstream consumers (this phase's own Derived Data / AI Readiness snapshots) have already captured what they need from it — candle data, being the lower-volume aggregate, can retain much longer or indefinitely.
5. **Continuous aggregation**: TimescaleDB's `CREATE MATERIALIZED VIEW ... WITH (timescaledb.continuous)` is a strong future replacement for parts of this phase's own `DerivedDataService` (which currently recomputes SMA/EMA/etc. from a bounded lookback window on each call) — noted as a natural next step, not built this phase since it requires the hypertable conversion above as a prerequisite.
6. **Bulk insert pipeline**: `HistoricalImportService.runBatchedImport()` (this phase) already writes in bounded per-batch chunks via `MarketCandleRepository.upsert()` inside a transaction — the natural next optimization once volumes justify it is a `COPY`-based bulk insert path for the historical-backfill case specifically (an initial full-history import), left as a documented future optimization since Prisma's query builder does not expose `COPY` directly and this phase's transactional per-row upsert (needed for correctness — duplicate/correction handling) is the safer default.
7. **Historical archive strategy**: once retention drops raw ticks, `MarketDataAiSnapshot`/`DerivedIndicatorSnapshot` (this phase) become the durable, compact historical record for anything older than the retention horizon — by design, since both are derived, recomputable-if-needed, and orders of magnitude smaller than the raw candle/tick history they summarize.

## What NOT to do

Do not run `create_hypertable()` against a table that already has data without following TimescaleDB's own migration procedure (it requires either an empty table or explicit `migrate_data => true`, with different performance/lock implications) — this is an operational runbook decision for whoever performs the actual migration, informed by real production data volume at that time, and is intentionally left for that future work rather than guessed at here.
