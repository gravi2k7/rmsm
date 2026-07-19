import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidExecutionError } from "../errors/execution.errors";

interface ExecutionIdProps {
  readonly value: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ExecutionId extends ValueObject<ExecutionIdProps> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<ExecutionId, InvalidExecutionError> {
    if (!UUID_PATTERN.test(value)) {
      return err(new InvalidExecutionError(`execution id "${value}" must be a valid UUID.`));
    }
    return ok(new ExecutionId(value));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
