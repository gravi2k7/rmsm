import type { IndicatorMetadata } from "./indicator-metadata.interface";
import type { IndicatorCategory } from "./indicator-category.enum";

/**
 * Registration, lookup, and discovery — the read/registration side of
 * the registry+factory split (see IndicatorFactory's own comment).
 * Indicator definitions are code, registered here at application
 * startup (the same "no database persistence for definitions" decision
 * this phase's `AI102_PHASE1_ARCHITECTURE.md` justifies at length,
 * directly following AI-101's own provider-registry precedent) — this
 * registry never queries a database.
 */
export interface IndicatorRegistry {
  register(metadata: IndicatorMetadata): void;
  get(identifier: string): IndicatorMetadata;
  tryGet(identifier: string): IndicatorMetadata | null;
  listByCategory(category: IndicatorCategory): IndicatorMetadata[];
  listAll(): IndicatorMetadata[];
}
