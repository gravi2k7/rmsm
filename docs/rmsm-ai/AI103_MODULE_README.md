# AI-103 Strategy Engine

The Strategy Engine lets an organization define, version, validate, approve, and publish trading
strategies as a structured rule tree (entry/exit conditions over indicators, market fields, and
constants), consumed by future modules (AI-104 Scanner, AI-105 Alerts, AI-106 Backtesting,
AI-107 Portfolio, AI-109 AI Analysis).

## Where things live

- **Backend**: `apps/api/src/modules/strategy-engine/` — domain, persistence, application/CQRS,
  REST API, events & integration. See `AI103_ARCHITECTURE_SUMMARY.md`.
- **Frontend**: `apps/web/src/app/strategies/**` (pages) +
  `apps/web/src/{components/strategy,lib,hooks}` (Strategy Builder UI). See
  `AI103_DEVELOPER_GUIDE.md`.
- **Shared design system**: `packages/ui/` — Radix + CVA primitives used by the Strategy Builder
  and by `apps/admin`.

## Milestones

| # | Name | Status |
|---|---|---|
| 1 | Domain Model | Complete |
| 2 | Persistence | Complete |
| 3 | Application Layer & REST API | Complete |
| 4 | Events & Integration | Complete |
| 5 | Strategy Builder UI & UX | Complete |
| 6 | Production Hardening, QA & Release | Complete (this doc set) |

## Quick links

- Getting started, adding an endpoint, rule-tree editing model → `AI103_DEVELOPER_GUIDE.md`
- Layers, domain model, named architectural gaps → `AI103_ARCHITECTURE_SUMMARY.md`
- Env vars, migrations, Docker, CI → `AI103_DEPLOYMENT_GUIDE.md`
- Metrics to watch, runbooks → `AI103_OPERATIONS_GUIDE.md`
- Common issues and fixes → `AI103_TROUBLESHOOTING_GUIDE.md`
- Every REST endpoint + rule-tree wire format + a worked curl example → `AI103_API_USAGE_GUIDE.md`
- What changed in the hardening pass, verification results →
  `AI103_MILESTONE6_PRODUCTION_HARDENING.md`
- Go/no-go checklist for a release → `AI103_MILESTONE6_RELEASE_CHECKLIST.md`
- Overall readiness assessment → `AI103_MILESTONE6_PRODUCTION_READINESS_REPORT.md`

## Quality gates

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

All four must pass. Backend and frontend are typechecked, linted, tested, and built
independently but share this one command at the repo root via Turborepo.
