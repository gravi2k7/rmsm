import { Entity, Guard } from "@rmsm/core";
import { StrategyRule } from "./strategy-rule";
import { StrategyParameter } from "./strategy-parameter";
import { RiskProfile } from "../value-objects/risk-profile";

export interface StrategyTemplateProps {
  readonly name: string;
  readonly description: string;
  readonly defaultRules: readonly StrategyRule[];
  readonly defaultParameters: readonly StrategyParameter[];
  readonly defaultRiskProfile: RiskProfile;
}

/** A reusable starting point for creating new strategies — a curated
 * bundle of default rules/parameters/risk profile (e.g. "Moving Average
 * Crossover Template"). `StrategyFactory.fromTemplate()` is the intended
 * consumer: it copies a template's own defaults into a brand-new
 * `Strategy`, rather than a `Strategy` holding a live reference back to
 * the template it started from (editing a strategy afterward should
 * never retroactively affect the template, or vice versa). */
export class StrategyTemplate extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: StrategyTemplateProps,
  ) {
    super(id);
  }

  static create(id: string, props: StrategyTemplateProps): StrategyTemplate {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.name, "name");
    return new StrategyTemplate(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get defaultRules(): readonly StrategyRule[] {
    return this.props.defaultRules;
  }

  get defaultParameters(): readonly StrategyParameter[] {
    return this.props.defaultParameters;
  }

  get defaultRiskProfile(): RiskProfile {
    return this.props.defaultRiskProfile;
  }
}
