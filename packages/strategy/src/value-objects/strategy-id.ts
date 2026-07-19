import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidStrategyError } from "../errors/strategy.errors";

interface StrategyIdProps {
  readonly value: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A validated strategy identifier. A dedicated value object (rather than
 * a bare `string`) so a `StrategyId` and, say, an `OpportunityId` can
 * never be accidentally interchanged at a call site — the type system
 * catches it, not a runtime check. */
export class StrategyId extends ValueObject<StrategyIdProps> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<StrategyId, InvalidStrategyError> {
    if (!UUID_PATTERN.test(value)) {
      return err(new InvalidStrategyError(`strategy id "${value}" must be a valid UUID.`));
    }
    return ok(new StrategyId(value));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
