import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidPortfolioError } from "../errors/portfolio.errors";

interface PortfolioIdProps {
  readonly value: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PortfolioId extends ValueObject<PortfolioIdProps> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<PortfolioId, InvalidPortfolioError> {
    if (!UUID_PATTERN.test(value)) {
      return err(new InvalidPortfolioError(`portfolio id "${value}" must be a valid UUID.`));
    }
    return ok(new PortfolioId(value));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
