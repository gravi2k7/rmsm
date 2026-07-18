import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { InvalidSymbolCodeError } from "../errors/market.errors";

interface SymbolCodeProps {
  readonly value: string;
}

const SYMBOL_CODE_PATTERN = /^[A-Z0-9._-]{2,20}$/;

/** A validated symbol/ticker identifier (e.g. `"EURUSD"`, `"BTCUSD"`,
 * `"AAPL"`, `"ES.FUT.202603"`). Normalizes to uppercase — symbol codes
 * are conventionally case-insensitive on input but must compare/hash
 * consistently once inside the domain. */
export class SymbolCode extends ValueObject<SymbolCodeProps> {
  private constructor(value: string) {
    super({ value });
  }

  static create(value: string): Result<SymbolCode, InvalidSymbolCodeError> {
    const normalized = value.trim().toUpperCase();
    if (normalized.length === 0) {
      return err(new InvalidSymbolCodeError(value, "must not be empty."));
    }
    if (!SYMBOL_CODE_PATTERN.test(normalized)) {
      return err(new InvalidSymbolCodeError(value, "must be 2-20 uppercase alphanumeric characters (., _, - allowed)."));
    }
    return ok(new SymbolCode(normalized));
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
