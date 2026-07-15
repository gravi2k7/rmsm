/**
 * The 8 categories named in this phase's spec (item 4). A plain string
 * union, not a Prisma enum — AI-102 has no database schema this phase
 * (see this module's own README / AI102_PHASE1_ARCHITECTURE.md's
 * "Database Impact" section for why), so there is nowhere for a Prisma
 * enum to live yet. If AI-102 ever gains a schema, this union is the
 * candidate source for a real enum at that point, not before.
 */
export type IndicatorCategory =
  | "TREND"
  | "MOMENTUM"
  | "VOLATILITY"
  | "VOLUME"
  | "MARKET_STRUCTURE"
  | "PATTERN_RECOGNITION"
  | "CUSTOM"
  | "COMPOSITE";
