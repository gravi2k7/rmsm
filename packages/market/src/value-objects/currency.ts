import { ValueObject, ok, err, type Result } from "@rmsm/core";
import { Currency } from "../enums/currency.enum";
import { CurrencyMismatchError } from "../errors/market.errors";

interface CurrencyCodeProps {
  readonly value: Currency;
}

/** A validated currency — the base/quote leg of a `Symbol`, or the
 * currency a `Price` is denominated in. Named `CurrencyCode` (not
 * `Currency`) to avoid colliding with `enums/currency.enum.ts`'s own
 * `Currency` enum export once both are re-exported from this package's
 * root barrel. */
export class CurrencyCode extends ValueObject<CurrencyCodeProps> {
  private constructor(value: Currency) {
    super({ value });
  }

  static create(value: string): Result<CurrencyCode, CurrencyMismatchError> {
    const normalized = value.toUpperCase();
    if (!Object.values(Currency).includes(normalized as Currency)) {
      return err(new CurrencyMismatchError(`"${value}" is not a known currency.`));
    }
    return ok(new CurrencyCode(normalized as Currency));
  }

  static fromEnum(value: Currency): CurrencyCode {
    return new CurrencyCode(value);
  }

  get value(): Currency {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
