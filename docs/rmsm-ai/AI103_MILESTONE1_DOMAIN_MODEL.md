# AI-103 Strategy Engine — Milestone 1: Domain Model

Status: Complete — Awaiting Review Before Milestone 2

## Milestone Plan (Agreed)

Per your request to split this into milestones, AI-103 will proceed as:

1. **Domain Model** ← this milestone
2. **Database** (Prisma schema, migrations, repositories)
3. **APIs** (REST controllers, DTOs, events, application-service orchestration)
4. **UI** (Next.js/React/Tailwind/Shadcn — strategy builder, rule editor, etc.)
5. **Testing** (integration/API/UI/acceptance tests layered on top of what Milestones 2-4 build)

Each milestone follows the same discipline this platform has used since AI-101: implemented for
real, verified (`typecheck`/`lint`/`test`/`build` where applicable), documented, and stopped for
your review before the next begins — never all five at once.

## 1. What Was Implemented

A complete, real DDD domain model for AI-103 — pure TypeScript, zero framework dependency (no
`@nestjs/common`, no Prisma, nothing infrastructure-related imported anywhere in
`domain/`), zero references to AI-101/AI-102 internals (verified by direct grep). Every
aggregate/entity/value-object listed in the master prompt's own "Domain Model" section is
present, with real behavior methods enforcing real invariants, not just data bags:

- **2 aggregate roots**: `Strategy`, `StrategyVersion` — deliberately split (not one aggregate),
  with the reasoning in "Architectural Decisions" below.
- **7 entities**: `Condition`, `Rule`, `RuleGroup`, `ExecutionProfile`, `StrategyValidation`,
  `StrategyApproval`, `StrategyPublication`, `StrategyHistoryEntry` (8, counting both — the
  master prompt's own "StrategyHistory" is modeled as a stream of `StrategyHistoryEntry`
  records, not a single mutable object).
- **5 value-object files**: strategy/version status (with a real, table-driven transition
  system), comparison/logical operators, the `Operand` discriminated union (the genuine AI-102
  integration point), strategy-level parameters, category/tags.
- **4 engine contracts**: `RuleEngine`, `ConditionEngine`, `ParameterEngine`, `ValidationEngine`
  — real interfaces, no implementation yet (Milestone 3's job, once there's a live AI-102
  dependency to wire against) — the same "contracts before implementation" discipline AI-102's
  own Phase 1 established.
- **1 domain error hierarchy**: `StrategyDomainError` and 6 named subclasses — the platform's
  7th such hierarchy, framework-free by design.
- **1 domain event contract file**: the exact 6 events named in the master prompt
  (StrategyCreated, StrategyUpdated, StrategyValidated, StrategyPublished, StrategyArchived,
  StrategyVersionCreated) — contracts only, no publishing mechanism yet (Milestone 3).

## 2. Files Changed

All 25 files are new (`apps/api/src/modules/strategy-engine/domain/`):

**Value objects (5)**: `strategy-status.enum.ts`, `comparison-operator.enum.ts`,
`operand.value-object.ts`, `strategy-parameter.value-object.ts`,
`strategy-category.value-object.ts`

**Entities (8)**: `condition.entity.ts`, `rule.entity.ts`, `rule-group.entity.ts`,
`execution-profile.entity.ts`, `strategy-validation.entity.ts`, `strategy-approval.entity.ts`,
`strategy-publication.entity.ts`, `strategy-history.entity.ts`

**Aggregates (2)**: `strategy.aggregate.ts`, `strategy-version.aggregate.ts`

**Contracts (4)**: `rule-engine.interface.ts`, `condition-engine.interface.ts`,
`parameter-engine.interface.ts`, `validation-engine.interface.ts`

**Events (1)**: `strategy-domain-events.interface.ts`

**Errors (1)**: `strategy-domain.errors.ts`

**Tests (3)**: `strategy.aggregate.spec.ts`, `strategy-version.aggregate.spec.ts`,
`execution-profile.entity.spec.ts`

Zero AI-101 files touched. Zero AI-102 files touched. Zero EP module files touched. Zero
`schema.prisma` change (that's Milestone 2).

## 3. Architectural Decisions

### `Strategy` and `StrategyVersion` are two separate aggregate roots, not one
A `Strategy` accumulates many versions over its lifetime — loading a full rule tree (every
`Rule`/`Condition` across every version) every time a caller just wants a strategy's name and
status would be real overhead, and a version's own draft→validate→approve→publish lifecycle
doesn't need the same transactional consistency boundary as the parent's top-level fields.
Referenced by `strategyId`, not nested — the same "aggregates should be as small as the real
consistency boundary requires" DDD principle. Within `StrategyVersion`, though,
`Rule`/`RuleGroup`/`Condition` genuinely ARE owned (not separate aggregates) — they have no
identity or lifecycle independent of the version they belong to, and the whole rule tree must
stay internally consistent as one unit.

### `ExecutionProfile`, `StrategyValidation`, `StrategyApproval`, `StrategyPublication` are each their own aggregate root
The master prompt lists these as independent top-level domain model items, not nested under
`StrategyVersion` — confirming they're meant to have independent lifecycles (an execution
profile can be created after a version is published; a validation run and an approval decision
are genuinely separate concerns from each other and from the version's own current state).

### AI-103 is organization-scoped — a genuine, deliberate reversal of AI-101/AI-102's own design
Both `Strategy` and every downstream entity carry `organizationId`. This is NOT a copy-paste of
AI-101/AI-102's pattern — it's the opposite of it, deliberately: AI-101's market data and
AI-102's indicator *definitions* are global product data (ADR-021's own reasoning). A trading
strategy a user builds is private, org-owned business data — structurally identical in kind to
EP-003's own organization-scoped entities. Getting this distinction right in the domain model
now avoids a much more painful correction at the database milestone.

### The AI-102 integration point is a data shape, not a dependency
`IndicatorOperand` (inside the `Operand` value object) describes WHICH AI-102 indicator output a
condition wants — identifier, version, parameters, output series name — mirroring the exact
shape AI-102's own `ExecuteIndicatorRequest` (Phase 3-4) already takes. It does not import
anything from AI-102's own module. Resolving an operand to an actual value is entirely
`ConditionEngine`'s job (Milestone 3+), calling AI-102's `IndicatorEngineService` — its own
single public entry point — never a repository or internal service, per this project's own "AI-103
consumes AI-102 services/contracts only" rule.

### Real state machines, not documentation prose
`StrategyVersion`'s own draft→published lifecycle is enforced by a real, checkable
`VERSION_STATUS_TRANSITIONS` table plus a `transitionTo()` method that throws
`InvalidVersionTransitionError` on an illegal jump — the same discipline every lifecycle state
machine in this platform has used since AI-102's own `IndicatorLifecycleState`. Publishing
immutability ("a published version is never edited in place," the master prompt's own words) is
enforced structurally: every mutating method on `StrategyVersion` checks status first and throws
`ImmutablePublishedVersionError` if the version has moved past `PUBLISHED` — verified by a real
test, not just documented as an intention.

## 4. Database Changes

None this milestone, by design — Milestone 1 is domain model only, mirroring AI-102's own Phase
1 precedent (contracts and structure before any persistence). The domain model above is the
direct input to Milestone 2's Prisma schema design.

## 5. API Changes

None this milestone. No controllers, no DTOs, no HTTP surface exists yet — Milestone 3's job,
once there's a real database and repositories to orchestrate against.

## 6. Events

The 6 named domain event contracts exist as real TypeScript interfaces
(`strategy-domain-events.interface.ts`) — no publishing mechanism yet. This mirrors every prior
"extension point, no implementation" file in this platform (AI-102's own Phase 2B/2C/3/5
extension-points files are the direct precedent) — a real, typed contract a future
application-service layer will actually construct and publish once there's something to react
to it (Milestone 3+).

## 7. Testing

22 real tests across 3 files, all genuinely executed, covering actual domain behavior — not
placeholder assertions:

- **`Strategy` aggregate** (9 tests): tag validation (format + duplicates), archived-state
  immutability across every mutating method, the archive-is-terminal-but-checked invariant.
- **`StrategyVersion` aggregate** (9 tests): the full DRAFT→...→SUPERSEDED happy path, illegal
  transition rejection (including skipping states), the REJECTED→DRAFT actionable-feedback path,
  and — most importantly — real proof that a PUBLISHED or SUPERSEDED version genuinely cannot be
  edited (not just documented as immutable).
- **`ExecutionProfile` entity** (4 tests): parameter merge semantics, including the
  explicit-`undefined`-doesn't-overwrite edge case.

`pnpm lint`: 0 errors. `pnpm typecheck`: 0 errors (verified against a true, freshly-rebuilt
Prisma stub — the module has zero database dependency, so this typecheck result is a genuine
signal, not a coincidence of what happened to already be stubbed). Full project suite: 67/67
suites, 468/468 tests passing, including this milestone's own 22. `pnpm build` not run this
milestone — no frontend or new build target exists yet to verify.

---

**Awaiting your review before Milestone 2 (Database).**
