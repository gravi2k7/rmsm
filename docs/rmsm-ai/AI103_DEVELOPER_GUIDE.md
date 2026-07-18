# AI-103 Strategy Engine — Developer Guide

Audience: engineers working on the Strategy Engine (backend `apps/api/src/modules/strategy-engine`
or frontend `apps/web/src/{app/strategies,components/strategy,lib,hooks}`).

## Layout

```
apps/api/src/modules/strategy-engine/
  domain/            Aggregates, entities, value objects, domain errors (Milestone 1)
  infrastructure/     Prisma repositories, mappers, event publisher/dispatcher (Milestones 2, 4)
  application/         Commands, queries, handlers — hand-rolled CQRS (Milestone 3)
  rest/                Controllers, DTOs, exception filter (Milestone 3)
  integration/         Domain→integration event mapping, handlers, metrics (Milestone 4)

apps/web/src/
  app/strategies/**     Pages (App Router)
  components/strategy/  Strategy-domain UI (rule builder, status badges, tables)
  components/ui-extra/  Cross-feature UI helpers (empty states, confirm dialogs)
  components/layout/    App shell, sidebar, session bar, theme toggle
  lib/api-client.ts     Typed fetch client for every Strategy Engine REST endpoint
  lib/rule-tree-*.ts    Wire↔client rule-tree conversion and pure tree-editing ops
  hooks/                TanStack Query hooks wrapping api-client.ts

packages/ui/src/components/  Design system primitives (Radix + CVA), used by apps/web and apps/admin
```

## Local setup

1. `pnpm install` at the repo root.
2. Backend: `prisma generate` needs real network access to Prisma's binary servers — this fails
   in network-restricted sandboxes (see `RMSM_SESSION_HANDOFF.md` for the stub workaround). On a
   normal developer machine with network access, `pnpm --filter @rmsm/database generate` works
   directly.
3. `pnpm --filter @rmsm/api dev` (or the repo's own dev script) to run the API against a real
   Postgres instance — env vars are listed in `AI103_DEPLOYMENT_GUIDE.md`.
4. `pnpm --filter @rmsm/web dev` to run the frontend. It has no backend of its own; every request
   goes to `NEXT_PUBLIC_API_URL` (defaults to `/api/v1`, meant to be reverse-proxied to the API
   in production — see the deployment guide for the dev alternative).
5. Because Milestone 5 didn't build a login screen (Authentication was explicitly out of that
   milestone's scope), open the app, click **Connect session** in the header, and paste an
   organization id + access token obtained from the existing Module 002 auth flow (e.g.
   `POST /auth/login` via curl). This is stored in `localStorage` under the key `rmsm-session`.

## Adding a new Strategy Engine REST endpoint (backend)

Follow the same pattern as every existing command/query:
1. Domain method on the aggregate if it's a new business operation (`Strategy`/`StrategyVersion`).
2. Command/Query + Handler under `application/`.
3. DTO(s) under `rest/dto/`.
4. Controller method — **controllers call only application-layer handlers**, verified structurally
   (see `rest/__tests__/layering.spec.ts`).
5. If the operation should raise a domain event, add it additively to
   `strategy-domain-events.interface.ts` and wire publishing into the handler (Milestone 4's own
   pattern — `correlationId` threaded from `req.requestId`).

## Consuming a new endpoint (frontend)

1. Add the DTO's shape to `apps/web/src/types/strategy.ts` — hand-mirrored, not generated (a
   named gap; see Milestone 5's own doc).
2. Add a method to `strategyApi`/`versionApi` in `lib/api-client.ts`.
3. Add a TanStack Query hook in `hooks/use-strategies.ts` or `hooks/use-strategy-versions.ts`,
   with real cache invalidation on the query keys it affects.
4. Wire it into a page/component. Keep business logic out of components — the client only
   re-derives *which actions are currently legal* from fields the backend already returns (e.g.
   version `status`), it never reimplements a state machine.

## Rule tree editing model

The backend's `RuleGroupDto`/`RuleDto` have no id field — `kind` (`"rule"` | `"group"`) is the
only discriminator. The frontend needs a stable id per node before save (React keys, drag-and-
drop, per-node validation-finding targeting), so `lib/rule-tree-mapper.ts` adds a client-only
`_id` field on every node and strips it again in `toRuleGroupWire()` before any API call.
`lib/rule-tree-ops.ts` holds every pure, immutable tree edit (`replaceNode`, `removeNode`,
`addChild`, `reorderChildren`, `findParentId`, `cloneWithNewIds`) — add new tree operations there,
not inline in components, so they stay independently testable (see
`lib/__tests__/rule-tree-ops.test.ts`).

## Testing conventions

- Backend: Jest, one spec file per service/handler, `__tests__/` alongside the code under test.
- Frontend: Vitest + Testing Library for units/components (`vitest.config.ts` maps `@/*`, enables
  the automatic JSX runtime, and polyfills the DOM APIs Radix primitives need under jsdom — see
  `vitest.setup.ts`). Playwright for E2E (`apps/web/e2e/`) — these need a live backend + seeded
  credentials (`E2E_ORGANIZATION_ID`, `E2E_ACCESS_TOKEN`, `E2E_STRATEGY_ID`); every spec
  `test.skip()`s itself when they're absent rather than asserting nothing or failing on a missing
  fixture.

## Quality gates

`pnpm typecheck && pnpm lint && pnpm test && pnpm build` — run from the repo root (via Turborepo)
or scoped to a package with `--filter`. All four must pass before a milestone is considered done.
