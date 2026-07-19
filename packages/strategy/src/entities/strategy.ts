import { AggregateRoot, Guard } from "@rmsm/core";
import type { Timeframe, SymbolCode } from "@rmsm/market";
import { StrategyId } from "../value-objects/strategy-id";
import { RiskProfile } from "../value-objects/risk-profile";
import { StrategyVersion } from "./strategy-version";
import { StrategyCreatedEvent } from "../events/strategy-created.event";
import { StrategyUpdatedEvent } from "../events/strategy-updated.event";
import { StrategyEnabledEvent } from "../events/strategy-enabled.event";
import { StrategyDisabledEvent } from "../events/strategy-disabled.event";
import { InvalidStrategyLifecycleTransitionError } from "../errors/strategy.errors";

export type StrategyLifecycleStatus = "DRAFT" | "TESTING" | "PAPER_TRADING" | "PRODUCTION" | "ARCHIVED";

/** The only transitions this domain considers valid. `ARCHIVED` is
 * reachable from every non-archived status (retiring a strategy at any
 * stage is always allowed) and is terminal — nothing transitions out of
 * it. Backward moves (`TESTING` → `DRAFT`, `PAPER_TRADING` → `TESTING`)
 * are allowed: real strategy development isn't strictly linear. */
const ALLOWED_TRANSITIONS: Readonly<Record<StrategyLifecycleStatus, readonly StrategyLifecycleStatus[]>> = {
  DRAFT: ["TESTING", "ARCHIVED"],
  TESTING: ["DRAFT", "PAPER_TRADING", "ARCHIVED"],
  PAPER_TRADING: ["TESTING", "PRODUCTION", "ARCHIVED"],
  PRODUCTION: ["ARCHIVED"],
  ARCHIVED: [],
};

export interface StrategyProps {
  readonly name: string;
  readonly description: string;
  status: StrategyLifecycleStatus;
  readonly riskProfile: RiskProfile;
  readonly timeframe: Timeframe;
  readonly supportedSymbols: readonly SymbolCode[];
  enabled: boolean;
  versions: StrategyVersion[];
  currentVersionId: string | null;
}

/**
 * A trading strategy, modeled independently from execution — this
 * aggregate has no idea how or whether it's actually being run; that's
 * an execution engine's job, reached only through
 * `interfaces/strategy-engine.interface.ts`. `Strategy` owns identity,
 * lifecycle, versioning, and enable/disable state — nothing about order
 * placement, fills, or live market interaction.
 */
export class Strategy extends AggregateRoot<StrategyId> {
  private props: StrategyProps;

  private constructor(id: StrategyId, props: StrategyProps) {
    super(id);
    this.props = props;
  }

  static create(
    id: StrategyId,
    props: Pick<StrategyProps, "name" | "description" | "riskProfile" | "timeframe" | "supportedSymbols">,
    occurredAt: Date = new Date(),
  ): Strategy {
    Guard.againstEmptyString(props.name, "name");
    Guard.againstEmptyArray(props.supportedSymbols, "supportedSymbols");

    const strategy = new Strategy(id, {
      ...props,
      status: "DRAFT",
      enabled: false,
      versions: [],
      currentVersionId: null,
    });
    strategy.addDomainEvent(new StrategyCreatedEvent(id.value, occurredAt));
    return strategy;
  }

  /** Overrides `Entity.equals()`: the base implementation compares `id`
   * via `Object.is` (reference equality), which is wrong when `TId` is
   * itself a `ValueObject` like `StrategyId` — two `Strategy` instances
   * loaded separately but referencing the same underlying id would
   * otherwise never compare equal. Delegates to `StrategyId.equals()`
   * (structural equality) instead. */
  equals(other: Strategy | null | undefined): boolean {
    if (other === null || other === undefined) return false;
    if (other === this) return true;
    if (other.constructor !== this.constructor) return false;
    return this.id.equals(other.id);
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get status(): StrategyLifecycleStatus {
    return this.props.status;
  }

  get riskProfile(): RiskProfile {
    return this.props.riskProfile;
  }

  get timeframe(): Timeframe {
    return this.props.timeframe;
  }

  get supportedSymbols(): readonly SymbolCode[] {
    return this.props.supportedSymbols;
  }

  get enabled(): boolean {
    return this.props.enabled;
  }

  get versions(): readonly StrategyVersion[] {
    return this.props.versions;
  }

  get currentVersion(): StrategyVersion | null {
    if (!this.props.currentVersionId) return null;
    return this.props.versions.find((v) => v.id === this.props.currentVersionId) ?? null;
  }

  /** Adds a new version and makes it current. Raises `StrategyUpdatedEvent`
   * — a new version is a real change to what the strategy actually does. */
  addVersion(version: StrategyVersion, occurredAt: Date = new Date()): void {
    this.props = { ...this.props, versions: [...this.props.versions, version], currentVersionId: version.id };
    this.addDomainEvent(new StrategyUpdatedEvent(this.id.value, occurredAt));
  }

  /** Transitions lifecycle status — throws `InvalidStrategyLifecycleTransitionError`
   * for any transition not in `ALLOWED_TRANSITIONS`. Raises `StrategyUpdatedEvent`
   * on success (a lifecycle change is itself a real update). */
  transitionTo(next: StrategyLifecycleStatus, occurredAt: Date = new Date()): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new InvalidStrategyLifecycleTransitionError(this.props.status, next);
    }
    this.props = { ...this.props, status: next };
    this.addDomainEvent(new StrategyUpdatedEvent(this.id.value, occurredAt));
  }

  enable(occurredAt: Date = new Date()): void {
    if (this.props.enabled) return;
    this.props = { ...this.props, enabled: true };
    this.addDomainEvent(new StrategyEnabledEvent(this.id.value, occurredAt));
  }

  disable(occurredAt: Date = new Date()): void {
    if (!this.props.enabled) return;
    this.props = { ...this.props, enabled: false };
    this.addDomainEvent(new StrategyDisabledEvent(this.id.value, occurredAt));
  }

  supportsSymbol(symbol: SymbolCode): boolean {
    return this.props.supportedSymbols.some((s) => s.equals(symbol));
  }
}
