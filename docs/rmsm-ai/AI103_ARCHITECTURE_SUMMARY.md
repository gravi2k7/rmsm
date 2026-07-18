# AI-103 Strategy Engine — Architecture Summary

## Layers (backend)

```
REST (controllers, DTOs)
    ↓ calls only
Application (hand-rolled CQRS: commands/queries + handlers)
    ↓ calls
Domain (Strategy, StrategyVersion aggregates; rule-tree entities; state machines)
    ↑ persisted via
Infrastructure (Prisma repositories, mappers, outbox event publisher)
```

Hand-rolled CQRS was a deliberate Milestone 3 decision — no other module in this platform uses
`@nestjs/cqrs`'s bus/dispatcher machinery, so introducing it here would be a one-off pattern.

## Layers (frontend)

```
Pages (app/strategies/**)
    ↓ use
Hooks (TanStack Query — hooks/use-strategies.ts, hooks/use-strategy-versions.ts)
    ↓ call
API client (lib/api-client.ts — typed fetch, one function per REST operation)
    ↓ HTTP
REST API (same backend layers as above)
```

Presentation-only: no business logic lives in components. The rule builder edits a tree
structure and the API client serializes it — actual rule *evaluation*, validation, and workflow
state transitions are entirely server-side. The client only reads the version's own `status`
field to decide which workflow buttons to show; it never reimplements the approval/publish state
machine.

## Domain model (unchanged since Milestone 1)

- `Strategy` aggregate: name, description, category, tags, status (`ACTIVE`/`ARCHIVED` — soft
  delete only, no hard delete anywhere in this platform).
- `StrategyVersion` aggregate: entry/exit rule trees, parameters, status
  (`DRAFT → PENDING_VALIDATION → VALIDATED → PENDING_APPROVAL → APPROVED → PUBLISHED →
  SUPERSEDED`, with `REJECTED` as a terminal branch from `PENDING_APPROVAL`).
- Rule tree: recursive `RuleGroup`/`Rule` entities, `AND`/`OR`/`NOT` operators, `Condition` with
  left/right operands (`indicator` | `market_field` | `constant`) and 9 comparison operators.

## Events & integration (Milestone 4, unchanged)

Real outbox pattern with one honestly-named gap: the event row is written immediately after the
triggering command handler's own `repository.save()` succeeds, not inside the same database
transaction — true same-transaction atomicity would require every Milestone 2 repository to
accept an externally-supplied `DbClient`, a structural change to now-frozen repositories that
was explicitly out of Milestone 4's scope. What's real: the outbox table, a background publisher
with genuine retry/poison handling, and an "the event write itself either fully succeeds or
throws" guarantee — at-least-once, not exactly-once.

## Frontend design system

`packages/ui` — shadcn-style primitives on Radix UI + `class-variance-authority`, shared between
`apps/web` and `apps/admin`. Not a third-party UI kit dependency; every component's source lives
in this repo. Full light/dark HSL token set in `apps/web/src/app/globals.css`, WCAG AA-verified
(see `AI103_MILESTONE6_PRODUCTION_HARDENING.md` for the actual contrast-ratio numbers).

## Known architectural gaps (all named, none silent)

| Gap | Where named | Why deferred |
|---|---|---|
| Outbox write isn't same-transaction as aggregate write | Milestone 4 doc | Frozen Milestone 2 repositories would need a structural change |
| No hand-written OpenAPI-generated client | `lib/api-client.ts` | No codegen step exists in this repo yet |
| Drag-and-drop reorder is same-parent only | `rule-builder.tsx` | Cross-group drag is a real, separate feature |
| No login screen | `session-store.ts` | Milestone 5's own scope explicitly excluded Authentication |
| No Execution Profiles UI | Milestone 5 doc | `ExecutionProfile` has domain/persistence but zero REST endpoints — would mean inventing backend API, out of a frontend-only milestone's scope |
| Sorting is client-side, current page only | `strategy-table.tsx` | `ListStrategiesQueryDto` has no `sort` param yet |
