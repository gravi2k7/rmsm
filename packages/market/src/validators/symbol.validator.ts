import { ok, err, type Result } from "@rmsm/core";
import type { CurrencyCode } from "../value-objects/currency";
import type { Volume } from "../value-objects/volume";
import { CurrencyMismatchError, InvalidVolumeError } from "../errors/market.errors";

/**
 * Pure, standalone validation functions for cross-field `Symbol` rules —
 * distinct from `SymbolCode`'s own construction-time format validation
 * (a `SymbolCode` alone can't validate rules that span *multiple* fields
 * of a `Symbol`, since it only ever sees its own single value). Used by
 * `SymbolFactory` before constructing a `MarketSymbol`, and reusable
 * anywhere else the same cross-field checks are needed independent of
 * full symbol construction.
 */

/** A symbol's base and quote currency must differ — `"USDUSD"` isn't a
 * meaningful tradable pair. */
export function validateDistinctCurrencies(base: CurrencyCode, quote: CurrencyCode): Result<true, CurrencyMismatchError> {
  if (base.value === quote.value) {
    return err(new CurrencyMismatchError(`base and quote currency must differ (both were "${base.value}").`));
  }
  return ok(true);
}

export function validateVolumeRange(min: Volume, max: Volume): Result<true, InvalidVolumeError> {
  if (min.units > max.units) {
    return err(new InvalidVolumeError(`minVolume (${min.units}) must not exceed maxVolume (${max.units}).`));
  }
  return ok(true);
}
