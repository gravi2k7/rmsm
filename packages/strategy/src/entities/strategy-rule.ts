import { Entity, Guard } from "@rmsm/core";

export type StrategyRuleKind = "ENTRY" | "EXIT";

export interface StrategyRuleProps {
  readonly kind: StrategyRuleKind;
  readonly description: string;
  /** A serialized rule expression (e.g. an indicator-comparison
   * expression) — this domain represents a rule as *data*, it never
   * evaluates one. Rule evaluation is an execution engine's job (see
   * `interfaces/strategy-engine.interface.ts`), entirely outside this
   * package, per its own "no infrastructure code" design rule. */
  readonly expression: string;
  enabled: boolean;
  readonly order: number;
}

/** One entry or exit rule belonging to a `StrategyVersion`. Rule
 * *composition* (nesting, AND/OR/NOT trees) is deliberately not modeled
 * here at the depth AI-103's own Strategy Engine models it — this
 * package's own rule representation is intentionally lighter: an ordered
 * list of independent rules with a raw `expression` string, since actual
 * rule composition/evaluation semantics belong to the execution engine
 * this domain only declares an interface for, not to this domain itself. */
export class StrategyRule extends Entity<string> {
  private props: StrategyRuleProps;

  private constructor(id: string, props: StrategyRuleProps) {
    super(id);
    this.props = props;
  }

  static create(id: string, props: Omit<StrategyRuleProps, "enabled"> & { enabled?: boolean }): StrategyRule {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.description, "description");
    Guard.againstEmptyString(props.expression, "expression");
    return new StrategyRule(id, { ...props, enabled: props.enabled ?? true });
  }

  get kind(): StrategyRuleKind {
    return this.props.kind;
  }

  get description(): string {
    return this.props.description;
  }

  get expression(): string {
    return this.props.expression;
  }

  get enabled(): boolean {
    return this.props.enabled;
  }

  get order(): number {
    return this.props.order;
  }

  enable(): void {
    this.props = { ...this.props, enabled: true };
  }

  disable(): void {
    this.props = { ...this.props, enabled: false };
  }
}
