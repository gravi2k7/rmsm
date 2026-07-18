# AI-103 Milestone 6 — Files Changed

Full writeup: docs/rmsm-ai/AI103_MILESTONE6_PRODUCTION_HARDENING.md (in the zip)

## Created — E2E tests
apps/web/e2e/fixtures/session.ts
apps/web/e2e/strategy-crud.spec.ts
apps/web/e2e/rule-builder.spec.ts
apps/web/e2e/version-workflow.spec.ts
apps/web/e2e/search-filter.spec.ts

## Created — code + tests
apps/web/src/hooks/use-debounced-value.ts
apps/web/src/hooks/__tests__/use-debounced-value.test.ts
apps/web/src/components/providers/__tests__/query-provider.test.ts

## Created — documentation (docs/rmsm-ai/)
AI103_DEVELOPER_GUIDE.md
AI103_ARCHITECTURE_SUMMARY.md
AI103_DEPLOYMENT_GUIDE.md
AI103_OPERATIONS_GUIDE.md
AI103_TROUBLESHOOTING_GUIDE.md
AI103_API_USAGE_GUIDE.md
AI103_MODULE_README.md
AI103_MILESTONE6_RELEASE_CHECKLIST.md
AI103_MILESTONE6_PRODUCTION_READINESS_REPORT.md
AI103_MILESTONE6_PRODUCTION_HARDENING.md

## Modified
apps/web/src/components/strategy/strategy-table.tsx       (debounced search — was firing a request per keystroke)
apps/web/src/components/strategy/rule-builder/rule-row.tsx        (React.memo, honest partial-benefit comment)
apps/web/src/components/strategy/rule-builder/group-editor.tsx    (React.memo, same)
apps/web/src/components/strategy/rule-builder/rule-builder.tsx    (KeyboardSensor — real fix for keyboard-only drag reorder)
apps/web/src/components/providers/query-provider.tsx      (retry policy: never retry 4xx, never auto-retry mutations)
apps/web/src/app/globals.css                               (WCAG AA fix: --success 35%→30% lightness)

## Verification
- pnpm typecheck: @rmsm/web, @rmsm/ui, @rmsm/admin all clean
- pnpm lint: @rmsm/web (66 files), @rmsm/ui — 0 errors
- pnpm test: @rmsm/web 52/52 tests, 10/10 files
- pnpm build: @rmsm/web 9/9 routes
- E2E: 20/20 specs discovered + typecheck clean; NOT executed (needs a live backend — no
  Postgres/API/browser binaries in this sandbox; see the production readiness report)
- Zero backend files touched. Zero new features.
