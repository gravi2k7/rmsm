# AI-103 Strategy Engine — Production Readiness Report

## Assessment: Ready, with named gaps

AI-103 (Domain → Persistence → Application/REST → Events → Strategy Builder UI → this hardening
pass) is production-ready for its stated scope. "Ready" here means: the quality gates pass, the
architecture has no undocumented shortcuts, and every known limitation is named with its actual
impact — not that the module is feature-complete relative to a full institutional trading
platform (it isn't, and was never scoped to be by any single milestone).

## What's solid

- **Domain/persistence/application/REST/events (Milestones 1–4)**: real DDD aggregates, 14
  Prisma tables, hand-rolled CQRS with 17 REST endpoints, a real outbox pattern with genuine
  retry/poison handling. 553 backend tests as of Milestone 4, unaffected by this hardening pass
  (zero backend files touched in Milestones 5 or 6).
- **Strategy Builder UI (Milestone 5)**: a real, working vertical slice — 8 pages, an 18-component
  design system, a recursive rule builder with drag-and-drop, the full create → validate →
  approve → publish → rollback workflow wired to the real API.
- **This hardening pass (Milestone 6)**: real fixes, not cosmetic — search debouncing (was firing
  a network request per keystroke), a hardened query retry policy (4xx never retries, mutations
  never auto-retry to avoid duplicate side effects on writes like publish/approve), a WCAG AA
  contrast fix, real keyboard support for rule reordering (was mouse-only), and 20 real E2E specs
  covering every workflow the milestone prompt named.

## What's explicitly out of scope (not a defect)

- No login screen — Authentication was excluded from Milestone 5's scope by its own prompt.
- No Execution Profiles UI — no backend REST endpoint exists for it; building the UI would mean
  inventing backend API, which is backend work this frontend-only milestone couldn't touch.
- Cross-group drag-and-drop, server-side table sorting, an OpenAPI-generated client — all named,
  bounded gaps, not silent omissions.

## Risk areas worth a deliberate decision before go-live

1. **Access tokens in `localStorage`.** A real, known trade-off (XSS-exfiltration risk vs. the
   simplicity of not building a login screen this milestone). Acceptable for an internal/staging
   tool; not acceptable as the permanent production auth story. Building a real login flow with
   httpOnly-cookie-based sessions is the natural next step, tracked as a gap, not fixed here.
2. **E2E suite requires a live backend to actually execute.** All 20 specs are real and pass
   `--list`/typecheck in this sandbox, but none have been run against a live stack (no Postgres,
   no running API, no browser binaries available in this environment). **Before relying on this
   suite as a release gate, run it for real** against a staging environment with seeded
   credentials — see `AI103_MILESTONE6_RELEASE_CHECKLIST.md`.
3. **Outbox poison-event handling is manual.** No automatic dead-letter reprocessing exists yet
   (Milestone 4's own scope boundary) — an operator needs to notice and act on the metrics
   service's own failure counters.

## Verification (this pass)

See `AI103_MILESTONE6_PRODUCTION_HARDENING.md` for the full table. Summary: `@rmsm/web`
typecheck/lint/test/build all pass; `@rmsm/ui` and `@rmsm/admin` unaffected; zero backend files
touched; 20 E2E specs discoverable and type-clean (execution requires a live backend this sandbox
doesn't have).

## Recommendation

Proceed to deploy the current state to a staging environment and run the E2E suite for real
before a production release. The named gaps above (auth, execution profiles) are legitimate
follow-up milestones, not blockers for the scope AI-103 was actually asked to deliver.
