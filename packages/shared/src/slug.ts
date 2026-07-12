/**
 * Organization slug validation. Pure function so both apps/api (server
 * enforcement) and apps/web (live UX feedback while typing) share one
 * source of truth — same pattern as password-policy.ts.
 *
 * Slugs are permanent once assigned (ADR-003) — this only validates
 * *format*, not availability. Availability is a database lookup, which is
 * why this stays a pure function rather than something that could
 * accidentally be mistaken for a full validity check.
 */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 63;

export interface SlugValidationResult {
  valid: boolean;
  failures: string[];
}

export function checkSlugFormat(slug: string): SlugValidationResult {
  const failures: string[] = [];

  if (slug.length < MIN_LENGTH) failures.push(`Must be at least ${MIN_LENGTH} characters.`);
  if (slug.length > MAX_LENGTH) failures.push(`Must be at most ${MAX_LENGTH} characters.`);
  if (!SLUG_PATTERN.test(slug)) {
    failures.push("Must be lowercase letters, numbers, and single hyphens only (no leading/trailing/double hyphens).");
  }

  return { valid: failures.length === 0, failures };
}

/** Best-effort conversion of an arbitrary string (e.g. an org name) into a valid slug candidate. Does not guarantee availability. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, "");
}
