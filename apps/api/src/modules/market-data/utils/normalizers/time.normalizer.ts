import { InvalidTimestampError, InvalidTimezoneError } from "../../validation/errors/market-data-validation.error";

/**
 * Every market-event timestamp this module handles is normalized to UTC
 * through here — the concrete mechanism behind Phase 1's "never use
 * local server time as market time" data standard. Supports converting
 * a provider's own timezone-local timestamp to UTC (Phase 2C's "support
 * provider timezone conversion"); does NOT implement holiday-calendar
 * awareness (explicitly deferred, ADR-024).
 */

/** Providers deliver timestamps as epoch millis, epoch seconds, or ISO strings — normalizes all three to a UTC Date. */
export function normalizeTimestamp(value: string | number, allowFuture = false): Date {
  let date: Date;

  if (typeof value === "number") {
    // Heuristic: epoch seconds are ~10 digits today, epoch millis ~13.
    // A value under 10^11 is treated as seconds, matching how most
    // provider APIs actually distinguish the two (never sends a
    // parallel "unit" field) — flagged as a heuristic, not a guarantee,
    // since it would misclassify a genuine millisecond timestamp from
    // the very early Unix epoch (pre-1973) as seconds; not a realistic
    // concern for market data, which has no history before electronic
    // exchanges existed.
    const millis = value < 100_000_000_000 ? value * 1000 : value;
    date = new Date(millis);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    throw new InvalidTimestampError(`"${value}" could not be parsed as a valid timestamp.`, { value });
  }

  if (!allowFuture && date.getTime() > Date.now() + 60_000) {
    // 60s tolerance for reasonable clock skew between this system and a
    // provider's own clock — not zero-tolerance, which would falsely
    // reject legitimate near-real-time data.
    throw new InvalidTimestampError(`Timestamp ${date.toISOString()} is in the future.`, { value, now: new Date().toISOString() });
  }

  if (date.getTime() < 0) {
    throw new InvalidTimestampError(`Timestamp ${date.toISOString()} is negative (before the Unix epoch).`, { value });
  }

  return date;
}

/**
 * Converts a wall-clock time believed to be in `timezone` to the
 * equivalent UTC Date — used when a provider reports a timestamp in its
 * own exchange-local time rather than UTC/epoch.
 *
 * **Input contract, stated explicitly because it's easy to get backwards**:
 * `wallClockAsUtc` is a `Date` constructed so its UTC-getter fields
 * (`getUTCFullYear()`, `getUTCHours()`, etc.) hold the WALL-CLOCK digits
 * to reinterpret — e.g. for "09:30 NYSE time," the caller builds
 * `new Date(Date.UTC(2026, 0, 15, 9, 30, 0))` (using `Date.UTC` purely as
 * a component-carrier, NOT asserting those digits are actually UTC) and
 * passes that in; this function reinterprets those same digits as
 * `timezone`-local and returns the true UTC instant. Verified against a
 * concrete trace (09:30 in America/New_York during EST, UTC-5, correctly
 * yields 14:30 UTC) in this file's own test.
 *
 * Validates the timezone identifier is a real IANA zone (via `Intl`,
 * which throws `RangeError` for an invalid one) before attempting the
 * conversion, rather than silently producing a wrong UTC time for a
 * typo'd zone.
 */
export function convertToUtc(wallClockAsUtc: Date, timezone: string): Date {
  try {
    // eslint-disable-next-line no-new -- constructed only to validate the timezone identifier; Intl throws RangeError for an invalid IANA zone
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new InvalidTimezoneError(`"${timezone}" is not a valid IANA timezone identifier.`, { timezone });
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(wallClockAsUtc).map((p) => [p.type, p.value]));
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  // The offset between how `wallClockAsUtc`'s instant reads in
  // `timezone` versus in UTC — subtracting it back out yields the true
  // UTC instant that reads as `wallClockAsUtc`'s wall-clock values in
  // `timezone`.
  const offsetMs = asIfUtc - wallClockAsUtc.getTime();
  return new Date(wallClockAsUtc.getTime() - offsetMs);
}
