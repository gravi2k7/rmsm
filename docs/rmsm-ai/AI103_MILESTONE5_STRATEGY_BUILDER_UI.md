# AI-103 Strategy Engine — Milestone 5: Strategy Builder UI & User Experience

Status: Complete (real, working vertical slice) — scope narrowed and gaps named explicitly below. Awaiting review.

## 1. What Was Implemented

This is the **first business UI in the RMSM repository**. `apps/web` shipped from Module 001 as
infrastructure-only (`QueryProvider`, an empty homepage, a `cn()` helper) — no design system, no
API client, no auth wiring, zero pages. Everything below was built from that baseline.

### Design system (`@rmsm/ui`) — 18 new components
Real shadcn-style primitives on Radix UI + `class-variance-authority`, not a UI kit dependency:
`Button` (with `asChild`/`loading`), `Input`, `Textarea`, `Label`, `Card` family, `Badge` (with
semantic `success`/`warning`/`destructive` variants), `Dialog` family, `Select` family, `Table`
family, `Skeleton`, `Tabs` family, `DropdownMenu` family, `Separator`, `Checkbox`, `Switch`,
`Tooltip`, `Toaster` (wraps `sonner`), `VisuallyHidden`/`SkipLink`. Full light/dark token set
added to `globals.css` + `tailwind.config.ts` (`primary`, `secondary`, `muted`, `accent`,
`destructive`, `success`, `warning`, `card`, `popover`, `ring` — the previous config had only
`border`/`background`/`foreground`).

### API integration
- `lib/api-client.ts` — typed fetch client for every Milestone 3/4 Strategy Engine REST endpoint
  (`strategyApi.*`, `versionApi.*`), hand-mirrored from the real DTOs in
  `apps/api/.../rest/dto/*` rather than generated (see Gap #1 below).
- `lib/rule-tree-mapper.ts` / `lib/rule-tree-ops.ts` — conversion between the backend's
  id-less `RuleGroupDto`/`RuleDto` wire format and a client-side tree with stable `_id`s for
  React keys and drag-and-drop, plus pure immutable tree-editing operations
  (`replaceNode`, `removeNode`, `addChild`, `reorderChildren`, `findParentId`, `cloneWithNewIds`).
- TanStack Query hooks (`hooks/use-strategies.ts`, `hooks/use-strategy-versions.ts`) covering
  list/get/create/update/archive/clone/publish for strategies and
  validate/request-approval/decide/publish/rollback for versions, with real cache invalidation.

### Pages
Strategy Dashboard, All Strategies (list with search/filter/sort/pagination/row actions),
Search Results (dedicated route backed by the same list operation, matching the backend's own
`GET /strategies/search` design), Create Strategy, Strategy Details (overview + versions tabs,
clone/archive/publish-latest-approved actions), New Version (entry/exit rule builders +
parameters editor), Version Detail (read-only rule tree + validate → request-approval →
approve/reject → publish → rollback workflow, each action gated by the version's own status).

### Rule Builder
A real, recursive, nested rule-group editor (`components/strategy/rule-builder/`): add
rule/add group, delete, duplicate (deep clone with fresh ids), collapse/expand, AND/OR/NOT
operator selection, drag-and-drop reordering via `dnd-kit` (scoped to siblings within one
group — see Gap #2), inline per-node validation findings keyed by the backend's own `nodeId`.
Condition/operand editing supports all three operand kinds (`indicator`/`market_field`/
`constant`) and all nine comparison operators including `BETWEEN`'s second operand.

### UX
Confirmation dialogs (archive/clone/publish/rollback/decide), toast notifications (success +
error) via `sonner`, skeleton loading states, empty states with contextual actions, a
`beforeunload` unsaved-changes guard on the two form pages (see Gap #3), light/dark mode toggle
persisted client-side, a skip-link + `sr-only` focus target on every page for keyboard users.

### Tests — 44 new tests across 8 files, all genuinely executed
`rule-tree-mapper` (wire↔client conversion + a deliberately-tested malformed-input path),
`rule-tree-ops` (every pure tree operation), `api-client` (URL building, query-string omission,
error-body parsing including the non-JSON-body fallback), `status-badges`, `parameters-editor`,
`use-request-context`, and a real interaction suite for `RuleBuilder` (add/delete/duplicate/
toggle via `@testing-library/user-event`, not shallow snapshots).

## 2. Named Gaps (Real, Not Silently Skipped)

1. **No generated API client.** The backend has no OpenAPI-codegen step in this repo, so
   `lib/api-client.ts` and `types/strategy.ts` are hand-mirrored from the DTO source files. A
   backend DTO change requires a manual update here — flagged, not hidden.
2. **Drag-and-drop is same-parent only.** Reordering works within one rule group's own children;
   dragging a rule/group into a *different* group isn't implemented. Named in
   `rule-builder.tsx`'s own header comment.
3. **Unsaved-changes warning is `beforeunload` only**, not an in-app route-intercept. Next.js App
   Router has no stable public API to intercept client-side `<Link>` navigation short of wrapping
   every call site. Documented in `use-unsaved-changes-warning.ts`.
4. **No login screen.** Milestone 5's own scope explicitly excludes Authentication, but every
   Strategy Engine endpoint is bearer-authenticated and org-scoped. `session-store.ts` +
   `SessionBar` let a developer paste an org id + access token obtained from the existing Module
   002 auth flow. Nothing here issues, refreshes, or validates tokens.
5. **Sorting is client-side, current page only.** `ListStrategiesQueryDto` has no `sort` query
   parameter yet, so the table's sort control only reorders the rows already fetched for the
   current page. A backend `sort` param would be needed for true server-side sorting.
6. **No Execution Profiles page, no Version Comparison page, no saved filters.** The prompt names
   all three, but `ExecutionProfile` has domain + persistence layers (Milestone 2) with **no REST
   controller or DTO** — building that page would mean inventing endpoints, which is backend
   work explicitly out of this milestone's scope ("Do NOT modify... REST APIs"). Version
   Comparison and saved filters are pure frontend gaps deferred for scope, not blocked by
   anything backend-side.
7. **Component/page/hook tests are real but not exhaustive.** 44 tests cover the rule-tree logic,
   API client, and core interactive components. Full a11y-audit tooling (e.g. `axe-core`
   integration), page-level integration tests with a mocked API layer, and Playwright e2e
   coverage of the complete create → validate → approve → publish flow are not yet in place.

## 3. Architecture

Presentation-only, per the prompt's own rule: `UI → hooks (TanStack Query) → api-client.ts → REST
API`. No business logic in components — validation display, status gating (e.g. which workflow
buttons show for which version status), and all real rule evaluation stay server-side. The
client only re-derives *which actions are currently legal* from the version's own `status` field
the backend already returns, mirroring backend state machine transitions rather than
reimplementing them.

## 4. Verification

| Check | Package | Result |
|---|---|---|
| `pnpm typecheck` | `@rmsm/ui` | ✅ 0 errors |
| `pnpm typecheck` | `@rmsm/web` | ✅ 0 errors |
| `pnpm lint` | `@rmsm/ui` | ✅ 0 errors |
| `pnpm lint` | `@rmsm/web` | ✅ 0 errors (50 files) |
| `pnpm test` | `@rmsm/web` | ✅ 44/44 tests, 8/8 files |
| `pnpm build` | `@rmsm/web` | ✅ 9/9 routes build (4 static, 3 dynamic, 2 API) |
| `@rmsm/admin` unaffected | — | ✅ typecheck still clean after `@rmsm/ui` changes |

Zero backend files touched (Domain, Persistence, Application Layer, REST APIs, Events — all
Milestone 1–4 code is byte-for-byte unchanged), per this milestone's own explicit rule.

## 5. Files Changed

**Created — `@rmsm/ui` (19 files):** `src/components/{button,input,textarea,label,card,badge,
dialog,select,table,skeleton,tabs,dropdown-menu,separator,checkbox,switch,tooltip,toaster,
visually-hidden}.tsx`.

**Created — `apps/web` (43 files):** 8 pages under `app/strategies/**`, 1 layout, 4 layout
components, 9 strategy/rule-builder components, 4 ui-extra components, 2 providers, 4 hooks,
5 lib modules, 1 types module, 8 test files.

**Modified:** `packages/ui/src/index.ts` (barrel export), `packages/ui/package.json` (Radix/
lucide/sonner deps), `packages/ui/tsconfig.json` (DOM lib), `apps/web/package.json` (dnd-kit,
lucide-react, testing-library, tailwindcss-animate), `apps/web/tailwind.config.ts` (full token
set), `apps/web/src/app/{layout,page}.tsx`, `apps/web/vitest.config.ts` + new
`apps/web/vitest.setup.ts`.

Zero AI-101, AI-102 files. Zero backend Strategy Engine files (Domain/Persistence/Application/
REST/Events). Zero Execution Engine, Market Data, Notifications, Billing, or Auth backend work.
