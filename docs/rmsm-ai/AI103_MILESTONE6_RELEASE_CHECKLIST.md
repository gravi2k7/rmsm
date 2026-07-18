# AI-103 — Release Checklist

Use this before deploying any AI-103 change (Milestones 1–6) to production.

## Build & tests
- [ ] `pnpm typecheck` passes at the repo root
- [ ] `pnpm lint` passes at the repo root
- [ ] `pnpm test` passes at the repo root (backend: 81 suites / 553 tests as of Milestone 4;
      frontend: 10 files / 52 tests as of Milestone 6 — confirm current counts, not these frozen
      numbers, before release)
- [ ] `pnpm build` passes for `@rmsm/api` and `@rmsm/web`
- [ ] E2E suite (`apps/web/e2e/`) run against a real staging backend with
      `E2E_ORGANIZATION_ID`/`E2E_ACCESS_TOKEN`/`E2E_STRATEGY_ID` set — not just `--list`'d

## Configuration
- [ ] `STRATEGY_OUTBOX_PUBLISHER_ENABLED`, `_POLL_INTERVAL_MS`, `_BATCH_SIZE`, `_MAX_RETRIES` set
      for the target environment (see `AI103_DEPLOYMENT_GUIDE.md`)
- [ ] `NEXT_PUBLIC_API_URL` set correctly for the target environment (or the reverse-proxy rule
      that makes the default `/api/v1` work is in place)

## Database
- [ ] `prisma migrate deploy` run against the target database with real network access to
      Prisma's binary servers (not the sandbox stub — that's local-typecheck-only)
- [ ] Migration includes the Milestone 4 `StrategyOutboxEvent` table + enum if not already applied

## Security
- [ ] No `dangerouslySetInnerHTML`, `eval`, or `new Function` in `apps/web/src` (verified via
      grep as part of Milestone 6 — re-verify if new code was added since)
- [ ] No token/credential values in `console.log` anywhere in `apps/web/src` (same)
- [ ] Access tokens still only ever set via the Session Bar's `type="password"` field, never
      logged, never placed in a URL query string

## Accessibility
- [ ] Design-system color pairs still meet WCAG AA (4.5:1 text, 3:1 UI) — re-run the contrast
      check in `AI103_MILESTONE6_PRODUCTION_HARDENING.md` if `globals.css` tokens changed
- [ ] Rule builder drag handles remain keyboard-operable (`KeyboardSensor` registered in
      `rule-builder.tsx`) — Space/Enter to pick up, arrow keys to move, Space/Enter to drop, Esc
      to cancel

## Monitoring & logging
- [ ] `StrategyEventMetricsService` counters visible in whatever dashboard/scrape target the
      platform uses (real in-memory counters — confirm they're actually being exported, not just
      computed)
- [ ] Correlation IDs (`requestId`) traceable end-to-end through API logs + outbox publisher spans

## Rollback procedure
- [ ] Previous API/web image tags identified and ready to redeploy
- [ ] Confirmed the migration being deployed is additive (no destructive column changes) — if
      not, a tested down-migration exists before deploying

## Backup
- [ ] Standard platform database backup cadence covers the new/changed tables (no AI-103-specific
      backup job exists or is needed — same instance, same backup policy as every other module)
