import { Entity, Guard } from "@rmsm/core";
import { ParameterValue, type ParameterType } from "../value-objects/parameter-value";
import { InvalidParameterError } from "../errors/strategy.errors";

export interface StrategyParameterProps {
  readonly name: string;
  readonly type: ParameterType;
  readonly defaultValue: ParameterValue;
  readonly required: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly allowedValues?: readonly string[];
}

/** A parameter *definition* — the name, type, default, and constraints a
 * `StrategyVersion` declares. Distinct from `ParameterValue` (a single
 * typed value) — a `StrategyParameter` is the schema; a concrete
 * `StrategyVersion` supplies actual `ParameterValue`s that must conform
 * to it. */
export class StrategyParameter extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: StrategyParameterProps,
  ) {
    super(id);
  }

  static create(id: string, props: StrategyParameterProps): StrategyParameter {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(props.name, "name");
    if (props.min !== undefined && props.max !== undefined && props.min > props.max) {
      throw new InvalidParameterError(props.name, `min (${props.min}) must not exceed max (${props.max}).`);
    }
    return new StrategyParameter(id, props);
  }

  get name(): string {
    return this.props.name;
  }

  get type(): ParameterType {
    return this.props.type;
  }

  get defaultValue(): ParameterValue {
    return this.props.defaultValue;
  }

  get required(): boolean {
    return this.props.required;
  }

  get min(): number | undefined {
    return this.props.min;
  }

  get max(): number | undefined {
    return this.props.max;
  }

  get allowedValues(): readonly string[] | undefined {
    return this.props.allowedValues;
  }

  /** Whether `candidate` satisfies this parameter's own type + range/enum
   * constraints — used by `StrategyValidatorService` before accepting a
   * `StrategyVersion`'s own parameter overrides. */
  accepts(candidate: ParameterValue): boolean {
    if (candidate.type !== this.props.type) return false;

    if ((this.props.type === "integer" || this.props.type === "decimal") && typeof candidate.value === "number") {
      if (this.props.min !== undefined && candidate.value < this.props.min) return false;
      if (this.props.max !== undefined && candidate.value > this.props.max) return false;
    }

    if (this.props.type === "enum" && typeof candidate.value === "string" && this.props.allowedValues) {
      return this.props.allowedValues.includes(candidate.value);
    }

    return true;
  }

  /** Builds a `ParameterValue` for this parameter's own default —
   * convenience for a `StrategyVersion` created without an explicit
   * override. */
  buildDefaultValue(): ParameterValue {
    return this.props.defaultValue;
  }
}
