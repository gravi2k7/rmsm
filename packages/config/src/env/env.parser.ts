import { z } from "zod";

/**
 * Small, reusable Zod building blocks so every domain schema coerces
 * booleans/lists/durations the same way instead of each hand-rolling its
 * own `.transform()`. Kept here (not in `utils/config.helper.ts`) because
 * these operate on raw, unvalidated `process.env` strings as part of
 * schema *parsing* — `config.helper.ts`'s own helpers operate on the
 * already-validated, already-typed config, a different responsibility.
 */

/** `"true"` (case-insensitive) is the only truthy string; everything else,
 * including an absent/empty value, is `false`. Stricter than a bare
 * `Boolean(str)` check, which would treat the string `"false"` as truthy. */
export function booleanFromString(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v.trim().toLowerCase() === "true"));
}

/** Parses a comma-separated env var into a trimmed, non-empty string
 * array — e.g. `FEATURE_FLAGS=strategy-outbox,new-dashboard`. Empty
 * segments (from trailing commas, double commas) are dropped rather than
 * producing `""` entries. */
export function commaSeparatedList() {
  return z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    );
}

/** A positive-integer duration in milliseconds, with a required default —
 * every `*_TTL_MS` / `*_INTERVAL_MS` var in this package uses this same
 * shape so they can't silently accept `0`, a negative number, or a
 * fractional value that would behave surprisingly as a timer duration. */
export function durationMs(defaultValue: number) {
  return z.coerce.number().int().positive().default(defaultValue);
}

/** A TCP port number (1–65535) with a required default. */
export function port(defaultValue: number) {
  return z.coerce.number().int().min(1).max(65535).default(defaultValue);
}
