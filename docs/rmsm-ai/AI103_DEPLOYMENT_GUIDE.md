# AI-103 Strategy Engine — Deployment Guide

## Components to deploy

| Component | Package | Build command | Run command |
|---|---|---|---|
| API (includes Strategy Engine) | `@rmsm/api` | `pnpm --filter @rmsm/api build` | `node apps/api/dist/main.js` |
| Web (Strategy Builder UI) | `@rmsm/web` | `pnpm --filter @rmsm/web build` | `pnpm --filter @rmsm/web start` (Next.js standalone) |
| Database | `@rmsm/database` (Prisma schema) | `prisma migrate deploy` | — |

## Required environment variables

### API (`apps/api`)
Existing Enterprise Platform variables (DB connection, JWT secrets, etc. — unchanged by AI-103)
plus the 4 Milestone 4 outbox-publisher keys:

| Variable | Purpose | Example |
|---|---|---|
| `STRATEGY_OUTBOX_PUBLISHER_ENABLED` | Turns the background outbox poller on/off | `true` |
| `STRATEGY_OUTBOX_POLL_INTERVAL_MS` | Poll cadence | `2000` |
| `STRATEGY_OUTBOX_BATCH_SIZE` | Events processed per poll | `50` |
| `STRATEGY_OUTBOX_MAX_RETRIES` | Retry budget before an event is quarantined as `POISON` | `5` |

### Web (`apps/web`)

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL the browser calls | `/api/v1` (expects a reverse proxy to the API) |

No other frontend env vars exist — there's no build-time API key, no analytics token, nothing
else to configure. The frontend has no authentication of its own to configure (see the Developer
Guide's note on the session bar).

## Reverse proxy

`apps/web` expects `NEXT_PUBLIC_API_URL` requests (default `/api/v1/*`) to reach the API. In
production this is typically a same-origin reverse-proxy rule (nginx/ingress) rather than CORS —
if the API is on a different origin, either set `NEXT_PUBLIC_API_URL` to the full API origin and
configure CORS on the API for the web app's origin, or keep the proxy.

## Database migrations

`pnpm --filter @rmsm/database migrate:deploy` runs all pending Prisma migrations, including the
Milestone 4 outbox table + enum migration. No new migrations were added in Milestone 5 (frontend
only) or Milestone 6 (hardening only) — the last schema change was Milestone 4's.

## Docker

The repo's existing Dockerfiles (per app, Enterprise Platform convention) apply unchanged — AI-103
introduced no new build steps or system dependencies for either `apps/api` or `apps/web`. The
frontend's dependencies (`@dnd-kit/*`, Radix UI, `sonner`, `zustand`, `tailwindcss-animate`) are
all pure npm packages with no native bindings, so no image changes are needed beyond a normal
`pnpm install --frozen-lockfile && pnpm build`.

## Health checks

- API: existing Enterprise Platform health endpoint(s), unchanged by AI-103.
- Web: `GET /api/health` (a Next.js route handler, not part of the Strategy Engine) — used by
  `apps/web/e2e/health.spec.ts` and suitable as a container liveness probe.

## CI/CD compatibility

Standard: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm
build`. One CI-specific note: `prisma generate` requires real network access to Prisma's binary
servers — this must succeed in CI (unlike the development sandbox this milestone was authored
in, which had no such access and used a hand-written stub client purely for local typechecking;
see `RMSM_SESSION_HANDOFF.md`). Playwright E2E specs additionally need `npx playwright install
--with-deps chromium` and a live API + seeded database — see `AI103_TROUBLESHOOTING_GUIDE.md` if
they don't discover credentials.
