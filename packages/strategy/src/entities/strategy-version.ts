import { Entity, Guard } from "@rmsm/core";
import { StrategyRule } from "./strategy-rule";
import { StrategyParameter } from "./strategy-parameter";

export type StrategyVersionStatus = "DRAFT" | "ACTIVE" | "DEPRECATED";

export interface StrategyVersionProps {
  readonly versionNumber: number;
  readonly rules: readonly StrategyRule[];
  readonly parameters: readonly StrategyParameter[];
  status: StrategyVersionStatus;
  readonly createdAt: Date;
}

/** One immutable-once-active version of a `Strategy`'s own rules and
 * parameters — versioning lets a strategy evolve without losing the
 * exact configuration that produced its historical results. */
export class StrategyVersion extends Entity<string> {
  private props: StrategyVersionProps;

  private constructor(id: string, props: StrategyVersionProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: Omit<StrategyVersionProps, "status">): StrategyVersion {
    Guard.againstEmptyString(id, "id");
    Guard.ensure(props.versionNumber >= 1, "versionNumber must be >= 1.");
    return new StrategyVersion(id, { ...props, status: "DRAFT" });
  }

  get versionNumber(): number {
    return this.props.versionNumber;
  }

  get rules(): readonly StrategyRule[] {
    return this.props.rules;
  }

  get parameters(): readonly StrategyParameter[] {
    return this.props.parameters;
  }

  get status(): StrategyVersionStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get entryRules(): readonly StrategyRule[] {
    return this.props.rules.filter((r) => r.kind === "ENTRY");
  }

  get exitRules(): readonly StrategyRule[] {
    return this.props.rules.filter((r) => r.kind === "EXIT");
  }

  activate(): void {
    this.props = { ...this.props, status: "ACTIVE" };
  }

  deprecate(): void {
    this.props = { ...this.props, status: "DEPRECATED" };
  }
}
