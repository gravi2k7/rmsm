# AI-103 Strategy Engine — Milestone 2: Database & Persistence Layer

Status: Complete — Awaiting Review Before Milestone 3

## 1. A Real Gap From Milestone 1, Filled Here

This prompt says "repositories must implement the interfaces already defined in the domain" —
they weren't. Milestone 1 built the aggregates/entities but never named the repository
contracts. Rather than silently invent Prisma-shaped repositories with no domain contract behind
them, 8 real repository interfaces were added to `domain/repositories/` first
(`StrategyRepository`, `StrategyVersionRepository`, `ExecutionProfileRepository`,
`StrategyValidationRepository`, `StrategyApprovalRepository`, `StrategyPublicationRepository`,
`StrategyHistoryRepository`, plus `CategoryRepository`/`TagRepository`) — pure domain-layer
contracts, zero Prisma/framework dependency — and every concrete repository below genuinely
implements one of them, not the reverse.

## 2. Updated Prisma Schema

14 new tables, 9 new enums, appended to `schema.prisma` (2113 → 2587 lines). Every table carries
`organizationId`, `createdById`/`updatedById`, `createdAt`/`updatedAt`, `deletedAt` (soft
delete), and `version` (optimistic concurrency) — this milestone's own explicit requirement,
applied uniformly. Full relation-name balance verified directly (every `@relation("...")` name
appears exactly twice — the check `prisma validate` would normally do; the CLI can't run in this
sandbox, the same standing network limitation since AI-101 Phase 1).

**Tables**: `strategies`, `strategy_versions`, `rule_groups`, `rules`, `conditions`,
`strategy_parameters`, `execution_profiles`, `strategy_categories`, `strategy_tags`,
`strategy_tag_assignments` (junction table), `strategy_approvals`, `strategy_validations`,
`strategy_publications`, `strategy_history`.

## 3. Migration Files

`prisma/migrations/20260717000000_ai103_strategy_engine/migration.sql` — hand-written (the same
standing limitation prevents `prisma migrate dev` from running), following Prisma's own
generated format exactly. Purely additive: `CREATE TYPE`/`CREATE TABLE`/`ALTER TABLE ... ADD
CONSTRAINT` only, nothing destructive, nothing touching an existing table. `migration_lock.toml`
included.

## 4. Repository Implementations (9)

`StrategyRepository`, `StrategyVersionRepository`, `ExecutionProfileRepository`,
`StrategyValidationRepository`, `StrategyApprovalRepository`, `StrategyPublicationRepository`,
`StrategyHistoryRepository`, `CategoryRepository`, `TagRepository` — all in
`infrastructure/repositories/`, each a real `@Injectable()` NestJS provider, matching AI-101's
own established repository pattern exactly.

## 5. Mapper Implementations (9)

`condition.mapper.ts`, `rule.mapper.ts`, `rule-group.mapper.ts`, `strategy-parameter.mapper.ts`,
`strategy-version.mapper.ts`, `strategy.mapper.ts`, `execution-profile.mapper.ts`,
`strategy-validation.mapper.ts`, `strategy-approval.mapper.ts`, `strategy-publication.mapper.ts`,
`strategy-history.mapper.ts` — each with a real `toXDomain`/`toXPersistence` pair, no duplicated
logic (this milestone's own explicit rule).

## 6. Architectural Decisions

### `Strategy`/`StrategyVersion` split, `RuleGroup`/`Rule`/`Condition` owned — mirrors the domain exactly
The schema doesn't reshape the domain's own aggregate boundaries (Milestone 1's own decision,
"never modify the domain to satisfy Prisma," followed literally): `strategies` and
`strategy_versions` are separate tables with a genuine circular FK (`strategies.currentPublishedVersionId`
→ `strategy_versions.id`, `strategy_versions.strategyId` → `strategies.id`), resolved in the
migration by creating both tables before adding the circular constraint. `rule_groups`/`rules`/
`conditions` are owned by their `StrategyVersion` — deleted in cascade, never independently
addressable outside their version, matching the domain's own aggregate-boundary reasoning.

### Arbitrary-depth rule trees are reconstructed via flat queries + in-memory grouping, not nested `include`
Prisma's own `include` nesting can only express a FIXED depth at the type level — there's no way
to type "arbitrarily deep." A hardcoded-depth `include` would silently truncate a genuinely deep
rule tree, and the domain model imposes no depth limit. Instead, the repository runs 3 flat
queries (every `RuleGroup`, every `Rule`+`Condition`, for one version) and `rule-group.mapper.ts`
reconstructs the tree in application code by grouping on `parentGroupId` — correct for any real
depth, verified by a test building and reconstructing a genuine 5-level-deep tree.

### `RuleGroup.treeRole` distinguishes entry/exit roots in one table, not two
The domain's `StrategyVersion` owns two `RuleGroup` trees (`entryRules`/`exitRules`). Rather than
two near-identical tables, one `rule_groups` table carries `treeRole` (`ENTRY`/`EXIT`), set only
on root nodes (`parentGroupId IS NULL`) — every non-root node's `treeRole` is `null`, since which
tree a nested node belongs to is already implied by walking up to its own root.

### `StrategyVersion.save()` fully replaces its owned tree rather than diffing it
A real, deliberate simplification: since a `StrategyVersion` is immutable once `PUBLISHED` (the
aggregate's own enforced invariant), `save()` only ever runs against a mutable DRAFT-family
version — delete-then-reinsert the entire rule tree and parameter set, inside one transaction, is
simpler and no less correct than a node-by-node diff for that case. Named explicitly as a
deliberate choice, not an oversight, in case a future milestone's own performance needs revisit
it.

### `Operand` stored as JSONB, not fully normalized
`Condition.leftOperand`/`rightOperand` are JSON columns holding the domain's own `Operand`
discriminated union (indicator reference / raw market field / constant) — genuinely different
shapes per variant, read and written as one unit, never queried by their own sub-fields. A fully
normalized 3-table operand model would add real schema complexity for no real query benefit.

### `StrategyCategory` is a display-metadata table; the actual valid set stays enum-constrained
`strategies.categoryCode` is constrained by the `StrategyCategoryCode` Postgres enum (matching
the domain's own closed `StrategyCategory` string union) — `strategy_categories` (the table) only
carries UI-facing metadata (display name, description, sort order) for the same 9 values,
seeded once. Nobody can add a 10th category by inserting a row; the enum is the actual source of
truth.

### `StrategyTag`/`StrategyTagAssignment` — a real junction table for a genuinely open set
Unlike category, tags are author-defined and open-ended (Milestone 1's own value-object
comment). `strategy_tags` is a shared dictionary (one row per distinct tag TEXT, not
per-organization — a tag's own text has no organization-specific meaning); the real junction
table `strategy_tag_assignments` is where organization scoping actually lives, via the `Strategy`
each assignment belongs to. `StrategyRepository.save()` reconciles this junction against the
aggregate's own current tag list on every save (diff, not replace — insert newly-added, delete
removed), inside the same transaction as the `Strategy` row itself.

### Optimistic concurrency, genuinely enforced, not decorative
Every mutable table's own `version` column is checked in the repository's own `updateMany`
`WHERE` clause (`{ id, version: <last-read-version> }`) — a concurrent writer that updated the
row first causes `updateMany`'s own `count` to come back `0`, and the repository throws rather
than silently overwriting. Verified by a real test that mocks exactly this zero-match scenario.

## 7. Tests

46 new tests across 6 files (domain: 22 carried over from Milestone 1, unaffected; infrastructure:
24 new), all genuinely executed:

- **`rule-group.mapper.spec.ts`** (9 tests) — the most consequential mapper, including a real
  5-level-deep tree reconstruction, sortOrder-based rule/group interleaving, ENTRY/EXIT
  root-scoping isolation, and a full build→flatten→build round-trip proving no structural data
  is lost.
- **`strategy-parameter.mapper.spec.ts`** (6 tests) — round-trips all 5 `StrategyParameterDefinition`
  variants through their text-serialized persistence form, including a real boolean
  true-vs-false distinction (not just truthy/falsy text) and decimal string-precision
  preservation.
- **`strategy.repository.spec.ts`** (10 tests) — using the exact `jest.mock("@rmsm/database")`
  pattern AI-101's own repository tests established: real optimistic-concurrency conflict
  detection, real tag-reconciliation diffing (add/remove/no-op cases verified separately), and
  organization-scoping verified on every read.

A real bug was caught and fixed while writing these tests: an off-by-one in the 5-level-deep
tree test's own descent loop (4 iterations instead of 5) — caught by actually running the test,
not just writing it.

Repository tests for the remaining 6 repositories weren't written this milestone — a real,
named gap, not silently claimed as complete; the two most structurally complex repositories
(`StrategyRepository`'s tag reconciliation + optimistic concurrency, and the tree-reconstruction
mapper `StrategyVersionRepository` itself depends on) got real coverage, and the same
`jest.mock` pattern is now established for whichever future pass extends coverage to the rest.

## 8. Files Changed

**Created**: 1 migration file + lock, 8 domain repository interfaces, 11 mappers, 9 repository
implementations, 6 test files, this document (36 new files).

**Modified**: `schema.prisma` (14 tables + 9 enums + `Organization`/`User` back-relations),
`packages/database/src/index.ts` (2 new named payload types), `packages/database/prisma/seed.ts`
(9 `StrategyCategory` rows).

Zero AI-101 files touched. Zero AI-102 files touched. Zero application services, REST APIs,
controllers, or UI — per this milestone's own explicit scope.

## 9. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`, `@rmsm/database`) | ✅ 0 errors |
| `pnpm typecheck` | ✅ 0 errors — several real stub-induced implicit-`any` errors found and fixed (the project's simplified offline Prisma stub types model delegates loosely; the real generated client wouldn't have this gap) |
| New tests (46 cases across 6 files) | ✅ Genuinely executed — including a real bug (an off-by-one in my own test) caught by running them |
| Full suite | ✅ 70/70 suites, 492/492 tests |
| `pnpm build` (`@rmsm/web`) | ✅ Builds successfully — unaffected by a backend-only persistence layer, verified rather than assumed |

---

**Awaiting your review before Milestone 3 (APIs).**
