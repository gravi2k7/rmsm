import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidParameterError } from "../errors/strategy.errors";

export type ParameterType = "integer" | "decimal" | "boolean" | "string" | "enum";
export type ParameterPrimitive = number | boolean | string;

interface ParameterValueProps {
  readonly type: ParameterType;
  readonly value: ParameterPrimitive;
}

/** A single, type-checked parameter value — e.g. a strategy's own
 * `"lookbackPeriod"` parameter holding `14` as an `"integer"`. Validates
 * that `value`'s runtime type actually matches the declared
 * `ParameterType` at construction, so a `StrategyParameter`'s own
 * `defaultValue`/a `StrategyVersion`'s own parameter overrides can never
 * hold a type-mismatched value. */
export class ParameterValue extends ValueObject<ParameterValueProps> {
  private constructor(type: ParameterType, value: ParameterPrimitive) {
    super({ type, value });
  }

  static create(name: string, type: ParameterType, value: ParameterPrimitive): Result<ParameterValue, InvalidParameterError> {
    switch (type) {
      case "integer":
        if (typeof value !== "number" || !Number.isInteger(value)) {
          return err(new InvalidParameterError(name, `expected an integer, got ${JSON.stringify(value)}.`));
        }
        break;
      case "decimal":
        if (typeof value !== "number" || !Number.isFinite(value)) {
          return err(new InvalidParameterError(name, `expected a finite decimal number, got ${JSON.stringify(value)}.`));
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          return err(new InvalidParameterError(name, `expected a boolean, got ${JSON.stringify(value)}.`));
        }
        break;
      case "string":
      case "enum":
        if (typeof value !== "string" || value.length === 0) {
          return err(new InvalidParameterError(name, `expected a non-empty string, got ${JSON.stringify(value)}.`));
        }
        break;
    }
    return ok(new ParameterValue(type, value));
  }

  get type(): ParameterType {
    return this.props.type;
  }

  get value(): ParameterPrimitive {
    return this.props.value;
  }

  asNumber(): number {
    if (typeof this.props.value !== "number") {
      throw new InvalidParameterError("<unnamed>", `value is a ${typeof this.props.value}, not a number.`);
    }
    return this.props.value;
  }
}
