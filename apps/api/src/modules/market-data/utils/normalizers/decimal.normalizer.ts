import { InvalidPrecisionError } from "../../validation/errors/market-data-validation.error";

/**
 * Precision-safe decimal handling for every price/volume field this
 * module deals with. Pure string arithmetic — never routes a value
 * through `parseFloat`/`Number` for anything that will be stored or
 * compared, since IEEE 754 floating point cannot represent most decimal
 * fractions exactly (the exact problem `Prisma.Decimal`, Phase 1's
 * schema, exists to avoid). This normalizer's output is always a
 * string, matching the domain-model convention already established in
 * Phase 2A (ADR-025) — a normalized candle's `open`/`high`/`low`/`close`
 * fields are strings all the way from the provider payload through to
 * the database column.
 */

const DECIMAL_STRING_PATTERN = /^-?\d+(\.\d+)?$/;

export interface DecimalNormalizationOptions {
  /** Maximum fractional digits allowed after normalization — matches the schema's actual @db.Decimal(precision, scale) for the field being normalized (e.g. 10 for price columns). Values with more digits are rejected, not silently truncated — silent truncation would be a real precision loss the caller never asked for. */
  maxScale: number;
  allowNegative?: boolean;
}

/**
 * Accepts a string OR number input (providers vary — some APIs return
 * prices as JSON numbers, some as strings) and produces a canonical
 * decimal string: no leading '+', no trailing zeros beyond what's
 * needed, no scientific notation, at most `maxScale` fractional digits.
 */
export function normalizeDecimal(value: string | number, options: DecimalNormalizationOptions): string {
  const raw = typeof value === "number" ? numberToDecimalString(value) : value.trim();

  if (!DECIMAL_STRING_PATTERN.test(raw)) {
    throw new InvalidPrecisionError(`"${String(value)}" is not a valid decimal string.`, { value, raw });
  }

  const isNegative = raw.startsWith("-");
  if (isNegative && !options.allowNegative) {
    throw new InvalidPrecisionError(`Negative value "${raw}" is not allowed for this field.`, { value });
  }

  const [intPart = "0", fracPart = ""] = (isNegative ? raw.slice(1) : raw).split(".");
  if (fracPart.length > options.maxScale) {
    throw new InvalidPrecisionError(
      `"${raw}" has ${fracPart.length} fractional digits, exceeding the maximum of ${options.maxScale} for this field.`,
      { value, actualScale: fracPart.length, maxScale: options.maxScale },
    );
  }

  const normalizedInt = intPart.replace(/^0+(?=\d)/, ""); // strip leading zeros, keep a single "0"
  const normalizedFrac = fracPart.replace(/0+$/, ""); // strip trailing zeros
  const sign = isNegative && normalizedInt !== "0" ? "-" : "";

  return normalizedFrac ? `${sign}${normalizedInt}.${normalizedFrac}` : `${sign}${normalizedInt}`;
}

/**
 * Converts a JS number to a decimal string WITHOUT going through a
 * float-to-string operation that could introduce representation error
 * for values `Number` can't hold exactly — `toString()` on a plain JS
 * number is safe for values within `Number.MAX_SAFE_INTEGER` and without
 * exponential notation, which covers every realistic price/volume value
 * this module handles; genuinely huge values are flagged as a known
 * limitation rather than silently mishandled.
 */
function numberToDecimalString(value: number): string {
  if (!Number.isFinite(value)) {
    throw new InvalidPrecisionError(`Non-finite number ${value} cannot be normalized to a decimal string.`, { value });
  }
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new InvalidPrecisionError(
      `${value} exceeds Number.MAX_SAFE_INTEGER — pass this value as a string instead of a number to avoid float representation error.`,
      { value },
    );
  }
  return value.toString();
}
