/**
 * The 8 categories named in Phase 1's own spec, plus `EXPERIMENTAL` —
 * a real fix, not a new addition invented this phase. Phase 2A's own
 * item 4 explicitly listed 9 categories (Trend, Momentum, Volatility,
 * Volume, Market Structure, Pattern Recognition, Composite, Custom,
 * **Experimental**), and `RegistryValidatorService` (Phase 2A) has
 * accepted `"EXPERIMENTAL"` as a valid runtime value ever since — but
 * this TYPE never included it, a latent type/runtime mismatch that
 * TypeScript itself couldn't catch because nothing had tried to use
 * `"EXPERIMENTAL"` in a type-checked position until this phase's own
 * `QueryIndicatorDto`. Found and fixed here, not silently worked
 * around by omitting `EXPERIMENTAL` from the DTO instead (which would
 * have been the easier, wrong fix — hiding a real capability the
 * validator already accepts, rather than correcting the type that was
 * actually incomplete).
 *
 * A plain string union, not a Prisma enum — AI-102 has no database
 * schema this phase (see this module's own README /
 * AI102_PHASE1_ARCHITECTURE.md's "Database Impact" section for why),
 * so there is nowhere for a Prisma enum to live yet. If AI-102 ever
 * gains a schema, this union is the candidate source for a real enum
 * at that point, not before.
 */
export type IndicatorCategory =
  | "TREND"
  | "MOMENTUM"
  | "VOLATILITY"
  | "VOLUME"
  | "MARKET_STRUCTURE"
  | "PATTERN_RECOGNITION"
  | "CUSTOM"
  | "COMPOSITE"
  | "EXPERIMENTAL";
