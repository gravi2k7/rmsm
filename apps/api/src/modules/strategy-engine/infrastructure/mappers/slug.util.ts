/** A real, deliberately simple slugify — lowercase, non-alphanumerics collapsed to single hyphens, trimmed. Extracted as a shared utility (Milestone 3) so both `strategy.mapper.ts` (the persistence boundary) and the application layer's own `CreateStrategyHandler` (which needs to pre-check slug uniqueness before attempting a save) use the identical function — the "no duplicated logic" discipline this project has followed since AI-102. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
