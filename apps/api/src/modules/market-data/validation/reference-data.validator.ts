import { InvalidProviderPayloadError, DuplicateRecordError } from "./errors/market-data-validation.error";

/**
 * Required-field, uniqueness, and identifier checks for reference data
 * (exchanges, instruments). "Uniqueness" here means WITHIN a batch being
 * validated together (e.g. a bulk instrument-universe import) — this
 * validator has no database access (Phase 2C's explicit rule) and
 * therefore cannot check uniqueness against already-persisted rows;
 * that check belongs to the repository layer's own unique constraints
 * (Phase 2A's `@@unique([exchangeId, symbol])` etc.), which are the real,
 * final word on cross-batch uniqueness. This validator catches an
 * obviously-broken payload (the same symbol appearing twice in one
 * import batch) before it ever reaches the database, which is a
 * meaningfully earlier and cheaper failure point, not a replacement for
 * the database constraint.
 */

export function assertRequiredFields<T extends Record<string, unknown>>(item: T, fields: (keyof T)[], context: string): void {
  for (const field of fields) {
    const value = item[field];
    if (value === null || value === undefined || value === "") {
      throw new InvalidProviderPayloadError(`${context}: required field "${String(field)}" is missing or empty.`, { item, field });
    }
  }
}

export function assertUniqueWithinBatch<T>(items: T[], keyFn: (item: T) => string, context: string): void {
  const seen = new Map<string, number>();
  items.forEach((item, index) => {
    const key = keyFn(item);
    const firstIndex = seen.get(key);
    if (firstIndex !== undefined) {
      throw new DuplicateRecordError(`${context}: duplicate key "${key}" at index ${index} (first seen at index ${firstIndex}).`, {
        key,
        firstIndex,
        duplicateIndex: index,
      });
    }
    seen.set(key, index);
  });
}

/** ISIN: 2-letter country code + 9 alphanumeric + 1 check digit = 12 characters. Format-only validation (regex), not a checksum verification — a real ISIN check-digit algorithm exists but is out of scope for a format normalizer; flagged as a real, named limitation rather than silently presented as full validation. */
const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}\d$/;
/** CUSIP: 9 alphanumeric characters. Same format-only caveat as ISIN. */
const CUSIP_PATTERN = /^[A-Z0-9]{9}$/;

export function assertValidIsin(isin: string): void {
  if (!ISIN_PATTERN.test(isin)) {
    throw new InvalidProviderPayloadError(`"${isin}" is not a validly-formatted ISIN (2 letters + 9 alphanumeric + 1 digit).`, { isin });
  }
}

export function assertValidCusip(cusip: string): void {
  if (!CUSIP_PATTERN.test(cusip)) {
    throw new InvalidProviderPayloadError(`"${cusip}" is not a validly-formatted CUSIP (9 alphanumeric characters).`, { cusip });
  }
}
