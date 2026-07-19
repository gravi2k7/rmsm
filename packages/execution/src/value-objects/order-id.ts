import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidOrderError } from "../errors/execution.errors";

interface OrderIdProps {
  readonly value: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OrderId extends ValueObject<OrderIdProps> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<OrderId, InvalidOrderError> {
    if (!UUID_PATTERN.test(value)) {
      return err(new InvalidOrderError(`order id "${value}" must be a valid UUID.`));
    }
    return ok(new OrderId(value));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
