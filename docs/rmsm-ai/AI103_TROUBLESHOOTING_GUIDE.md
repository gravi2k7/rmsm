# AI-103 Strategy Engine — Troubleshooting Guide

## Frontend

**"No session connected" empty state on every page.**
Expected until you click **Connect session** and paste a real org id + access token. See the
Developer Guide — there's no login screen in this milestone by design.

**A mutation (create/publish/approve/...) fails with a toast but no detail.**
The toast shows the backend's own `ApiError.message`. Check the browser's network tab for the
full response body (`statusCode`, `code`, `message`, `details`) — the frontend doesn't swallow or
rewrite backend error messages, it displays them as-is.

**A 401/403 doesn't retry, but a network blip also doesn't seem to retry twice.**
Intentional (Milestone 6 hardening) — 4xx responses never retry (see `query-provider.tsx`'s
`shouldRetry`), and everything else retries exactly once. If you need to confirm a transient
failure actually retried, check the Network tab for two requests close together in time.

**Rule builder drag-and-drop doesn't move a rule into a different group.**
Known, named limitation — reordering is scoped to siblings within one group. Delete + re-add in
the target group is the current workaround.

**A version's `entryRules`/`exitRules` fails to render with "Malformed rule tree".**
`fromWireRuleTree()` throws rather than guessing at a shape it doesn't recognize. This means the
backend returned something that doesn't match the `kind: "rule" | "group"` discriminator this
milestone's own DTO defines — check the raw API response; this is very likely a real backend/
frontend contract mismatch worth filing, not a frontend bug to patch around silently.

**Playwright E2E tests all report "skipped".**
Expected without a live backend. Set `E2E_ORGANIZATION_ID`, `E2E_ACCESS_TOKEN`, and (for the rule
builder / version workflow specs) `E2E_STRATEGY_ID` to run them for real. See
`apps/web/e2e/fixtures/session.ts`.

## Backend

**`pnpm typecheck` fails locally with dozens of Prisma-model type errors.**
You're very likely missing a real `prisma generate` run (needs network access to Prisma's binary
servers) — see `RMSM_SESSION_HANDOFF.md` for the sandbox stub workaround, which is *not* needed
on a normal developer machine or in CI with network access.

**A command handler's event never reaches `AuditEventHandler`.**
See the Operations Guide's outbox runbook — check
`STRATEGY_OUTBOX_PUBLISHER_ENABLED` and the metrics service's per-handler failure counters before
assuming an outbox bug; failure isolation means other handlers succeeding is expected even if one
is broken.

**A duplicate-slug (or other business-rule) failure still shows an event was published.**
It shouldn't — Milestone 4's own test suite explicitly covers "never publish failed operations"
(a duplicate-slug failure never calls `eventPublisher.publish`). If you see this in practice,
it's a regression worth a bug report with the specific command and error code.

## Both

**`pnpm build` passes locally but fails in CI only.**
Most likely a `prisma generate` / network-access difference (see above) or a Node/pnpm version
mismatch — this repo pins pnpm via `packageManager` in the root `package.json`; confirm CI uses
the same version.
