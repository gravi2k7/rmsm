# Persistence Roadmap

## Current state — Phase 4A: in-memory repositories

Phase 4A's own explicit scope is the **Enterprise API Application Layer** — controllers,
versioned REST endpoints, DTOs, CQRS (commands/queries/handlers), application services,
validation, Swagger, JWT/RBAC integration, global exception handling, mapping, pagination,
request logging, and integration tests — **not** production persistence. Per that scope, this
phase does not touch `schema.prisma`, adds no Prisma models, creates no migrations, and
implements no Prisma-backed repository.

Instead, every one of the 6 business domains (Market, Strategy, Opportunity, Decision,
Execution, Portfolio) is backed by an **in-memory repository adapter** implementing that
domain's own repository interface exactly, at:

```
apps/api/src/infrastructure/persistence/memory/
  market/       exchange.memory-repository.ts, symbol.memory-repository.ts,
                market.memory-repository.ts, market.seed.ts
  strategy/     strategy.memory-repository.ts
  opportunity/  opportunity.memory-repository.ts
  decision/     decision.memory-repository.ts
  execution/    execution.memory-repository.ts
  portfolio/    portfolio.memory-repository.ts, portfolio.seed.ts
```

Every application-layer command/query handler depends on the **repository interface** (e.g.
`StrategyRepository` from `@rmsm/strategy`), injected via a `Symbol` token (see each domain's own
`*.tokens.ts`) — never on the concrete `InMemoryXRepository` class. That's the whole point of the
interface existing: swapping in a real, Prisma-backed implementation later is a **one-line change
in each module's own provider registration** (`{ provide: STRATEGY_REPOSITORY, useClass:
InMemoryStrategyRepository }` → `useClass: PrismaStrategyRepository`), not a change to any
handler, mapper, or controller.

### Why in-memory, concretely

- Each adapter is a plain class over one or more `Map`s — `save()`/`findById()`/`findByStatus()`
  etc. exactly matching the domain interface's own method signatures.
- Data does **not** survive a process restart. This is correct and expected for this phase: the
  deliverable is a working, testable application layer, not a durable store.
- `Market` and `Portfolio` seed a small amount of reference data on boot (`market.seed.ts`,
  `portfolio.seed.ts`) so `GET /markets`/`GET /symbols`/`GET /portfolio` return real data
  immediately rather than an empty list on every fresh boot — a Phase 4A demonstration
  convenience, not a substitute for a real reference-data import process.

### Known limitations of this approach (found while building it, not discovered later)

- **`ExecutionRepository` has no way to list every `Execution` directly** — only
  `findExecutionById`/`findExecutionByOrderId`. `ListExecutionsHandler` derives "every execution"
  by first listing every order (the interface's own `findOrdersByStatus`, queried per status and
  merged) and then looking up each order's own execution. Architecturally sound, but a real
  implementation should give this a direct index (a straightforward addition to
  `ExecutionRepository` in a future domain-package revision, out of this phase's own "no domain
  package changes" scope).
- **`PortfolioRepository.saveTrade(trade)` takes no `portfolioId`**, and `@rmsm/portfolio`'s own
  `Trade` entity carries no portfolio association either. The in-memory adapter stores every trade
  in one flat list and `findTradesByPortfolio()` returns all of them regardless of the given id —
  correct for this phase's single-portfolio usage (see below), wrong for a real multi-portfolio
  deployment. A real implementation needs a `portfolioId` foreign key at the schema level, which
  in turn likely means `PortfolioRepository.saveTrade()` itself needs a `portfolioId` parameter —
  a real, small domain-interface change for a future phase to make.
- **No portfolio ownership model.** `Portfolio` (the domain aggregate) carries no owner/user
  field, and Phase 4A doesn't invent one. `GET /portfolio` currently always resolves to one
  well-known seeded id (`DEFAULT_PORTFOLIO_ID`, in `portfolio.seed.ts`). Introducing real
  per-user/per-organization portfolios is a genuine new decision (one-per-user? one-per-org?
  multiple per user?) for whichever phase actually needs it — not implied by anything built so
  far, so it isn't guessed at here.
- **`StrategyRepository`/`OpportunityRepository`/`DecisionRepository` have no `findAll()`** —
  every "list everything" query handler in this phase's own application layer derives it by
  querying every possible status value (via the interface's own `findByStatus()`) and merging.
  Correct and interface-compliant, but means a "list" query does `O(number of statuses)`
  repository calls instead of one. Irrelevant for an in-memory `Map` scan; worth reconsidering for
  a real query-planner-backed store, where a real `findAll()` (or a status-agnostic filter) would
  likely be cheaper than N separate indexed lookups.

None of the above required changing any of the 6 business domain packages — every limitation was
worked around using only each interface's own existing methods, and is called out explicitly here
rather than left for a future engineer to rediscover.

## Future work — a dedicated persistence phase

The following is genuinely out of scope for Phase 4A and belongs to whichever phase actually
implements production persistence:

### 1. Prisma schema design

Each domain's own aggregate/entity graph needs real tables:

- **Market**: `Exchange`, `MarketSession`, `MarketSymbol`, `Instrument`, `TradingCalendar`,
  `MarketHoliday`, `Candle` (likely a hypertable/TimescaleDB-backed time-series table given
  volume), `Tick`, `Quote`.
- **Strategy**: `Strategy`, `StrategyVersion`, `StrategyRule`, `StrategyParameter`,
  `StrategyTemplate`.
- **Opportunity**: `Opportunity`, `Signal`, `MarketContext`.
- **Decision**: `Decision`, `Approval`, `RiskAssessment`, `PositionSize`.
- **Execution**: `Order`, `Fill`, `Execution`, `ExecutionPlan`, `ExecutionSession`.
- **Portfolio**: `Portfolio` (with a real owner/user foreign key — see the ownership-model gap
  above), `Position`, `Holding`, `Trade` (with a `portfolioId` foreign key — see the gap above),
  `Balance`, `Equity`.

This is a genuinely large schema addition (~30 tables across 6 domains) and should be its own
reviewed migration, not folded into an unrelated phase.

### 2. Prisma repository implementations

One concrete class per domain repository interface, replacing each `InMemoryXRepository` —
`PrismaStrategyRepository implements StrategyRepository`, etc. — following the exact same
adapter pattern `packages/database`'s own `PrismaRepository` base class (built in an earlier
phase) already establishes for other domains. Domain value objects (e.g. `SymbolCode`, `Price`,
`RiskScore`) need explicit mapping to/from their own raw Prisma column representation at the
repository boundary — the domain packages themselves never see a Prisma type.

### 3. Migrations

Standard `prisma migrate dev` / `prisma migrate deploy` workflow, additive-only per this
platform's own established convention (no destructive migrations, soft deletes only).

### 4. Transactions

Several application-layer operations that are currently "read, mutate in memory, write back" as
effectively-atomic (because a `Map` mutation is synchronous and single-threaded) need **real**
transactional boundaries once persistence is real and concurrent — e.g. `DecisionService.approve()`
reading a `Decision`, validating its risk assessment, and saving the result needs to happen inside
one Prisma `$transaction`, using exactly the `TransactionManager`/`UnitOfWork` abstractions
`packages/database` already provides for this.

### 5. Concurrency

The in-memory adapters have no optimistic-locking/concurrency-conflict story at all (a `Map.set()`
always just overwrites). A real implementation needs to reintroduce the platform's own established
optimistic-locking convention (`VersionedEntity`/`OptimisticLockError`, already defined in
`packages/database`) for every aggregate that can be concurrently modified — most pressingly
`Portfolio` (concurrent order fills) and `Order` (concurrent fill application).

### 6. Caching

Reference/slow-changing data this phase already treats specially even in-memory (`Market`'s own
seeded exchanges/symbols) is exactly what a real deployment would want cached in front of
Postgres (Redis, already a platform dependency via `@nestjs/bullmq`/queues) rather than hitting
the database on every `GET /markets` call.

### 7. Production persistence readiness

Beyond the above: connection pooling configuration, read replicas for the heavier list/search
queries, backup/restore procedures, and the observability (slow-query logging, connection-pool
metrics) a real production Postgres deployment needs — all genuinely new work, not an extension
of anything Phase 4A built.
