import { RuleGroup } from "../entities/rule-group.entity";
import type { StrategyParameterDefinition } from "../value-objects/strategy-parameter.value-object";
import { VERSION_STATUS_TRANSITIONS, StrategyVersionStatus } from "../value-objects/strategy-status.enum";
import { InvalidVersionTransitionError, ImmutablePublishedVersionError } from "../errors/strategy-domain.errors";

/**
 * The second aggregate root — deliberately NOT nested inside `Strategy`
 * (below). A `Strategy` can accumulate many versions over its lifetime
 * (this is literally "Strategy Versioning," a named top-level
 * responsibility); loading the entire version history — full rule
 * trees and all — every time a caller just wants the strategy's own
 * name and status would be real, unnecessary overhead, and more
 * importantly, a version's own edit/validate/approve/publish lifecycle
 * genuinely doesn't need to happen inside the SAME transactional
 * consistency boundary as the parent `Strategy`'s own top-level fields.
 * Two aggregates, referenced by `strategyId`, not one large one — the
 * same "aggregates should be as small as the real consistency
 * boundary requires" DDD principle applied deliberately here.
 *
 * `entryRules`/`exitRules` (two separate `RuleGroup` trees, not one
 * merged tree with an artificial top-level split) ARE owned by this
 * aggregate — a `Rule`/`Condition` has no identity or lifecycle
 * independent of the version it belongs to, and the whole tree must
 * stay internally consistent as one unit (this is where the "small
 * aggregate" principle above stops applying — Rule/RuleGroup/Condition
 * genuinely belong inside this boundary, not as their own aggregates).
 *
 * **Immutability once published** (this module's own explicit
 * requirement: "a published version is never edited in place") is
 * enforced structurally here, not just by convention — every mutating
 * method checks `status` first and throws
 * `ImmutablePublishedVersionError` if this version has already moved
 * past `PUBLISHED`.
 */
export class StrategyVersion {
  private _status: StrategyVersionStatus;
  private _entryRules: RuleGroup;
  private _exitRules: RuleGroup;
  private _parameters: StrategyParameterDefinition[];

  constructor(
    public readonly id: string,
    public readonly strategyId: string,
    public readonly versionNumber: number,
    status: StrategyVersionStatus,
    entryRules: RuleGroup,
    exitRules: RuleGroup,
    parameters: StrategyParameterDefinition[],
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
  ) {
    this._status = status;
    this._entryRules = entryRules;
    this._exitRules = exitRules;
    this._parameters = parameters;
  }

  get status(): StrategyVersionStatus {
    return this._status;
  }
  get entryRules(): RuleGroup {
    return this._entryRules;
  }
  get exitRules(): RuleGroup {
    return this._exitRules;
  }
  get parameters(): readonly StrategyParameterDefinition[] {
    return this._parameters;
  }

  /** Real, checkable transition enforcement — consults `VERSION_STATUS_TRANSITIONS` (the same table-driven discipline every lifecycle state machine in this platform has used since AI-102's own `IndicatorLifecycleState`), not a hand-rolled if-chain that could silently drift from the table. */
  transitionTo(next: StrategyVersionStatus): void {
    const allowed = VERSION_STATUS_TRANSITIONS[this._status];
    if (!allowed.includes(next)) {
      throw new InvalidVersionTransitionError(`Cannot transition StrategyVersion ${this.id} from "${this._status}" to "${next}".`, { versionId: this.id, from: this._status, to: next });
    }
    this._status = next;
  }

  /** Editing a version's own rule tree is only legal while it's still mutable — anything at or past PUBLISHED is permanently frozen, per this aggregate's own header comment. */
  updateEntryRules(entryRules: RuleGroup): void {
    this.assertMutable();
    this._entryRules = entryRules;
  }

  updateExitRules(exitRules: RuleGroup): void {
    this.assertMutable();
    this._exitRules = exitRules;
  }

  updateParameters(parameters: StrategyParameterDefinition[]): void {
    this.assertMutable();
    this._parameters = parameters;
  }

  private assertMutable(): void {
    if (this._status === "PUBLISHED" || this._status === "SUPERSEDED") {
      throw new ImmutablePublishedVersionError(`StrategyVersion ${this.id} is "${this._status}" and can never be edited in place — create a new version instead.`, { versionId: this.id, status: this._status });
    }
  }
}
