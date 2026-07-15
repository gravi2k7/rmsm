import type { IndicatorDefinition } from "./indicator-definition.interface";
import type { IndicatorCategory } from "./indicator-category.enum";

/**
 * Registration, lookup, and discovery — the read/registration side of
 * the registry+factory split (see IndicatorFactory's own comment).
 * Indicator definitions are code, registered here at application
 * startup (justified at length in `AI102_PHASE1_ARCHITECTURE.md`
 * Section 6, directly following AI-101's own provider-registry
 * precedent) — this registry never queries a database.
 *
 * Returns `IndicatorDefinition` (Phase 2A's full, immutable object),
 * not the narrower `IndicatorMetadata` — Phase 1 had this interface
 * returning `IndicatorMetadata` before the Phase 2A restructuring split
 * that name into two (`indicator-metadata.interface.ts`'s own header
 * comment has the full reasoning).
 *
 * **Version management** (Phase 2A item 1's own explicit requirement,
 * not present in Phase 1): `get`/`tryGet` resolve to the LATEST
 * registered version of an identifier by default; `getVersion` resolves
 * a specific one. Multiple versions of the same `identifier` can be
 * registered simultaneously (item 7's own explicit requirement — RDSE
 * 1.0.0, 1.1.0, and 2.0.0 coexisting), which is why version resolution
 * needs its own explicit method rather than `identifier` alone being a
 * unique key.
 */
export interface IndicatorRegistry {
  register(definition: IndicatorDefinition): void;
  /** Resolves to the latest registered version. */
  get(identifier: string): IndicatorDefinition;
  tryGet(identifier: string): IndicatorDefinition | null;
  /** A specific version — e.g. "rdse" at "1.0.0" specifically, even after 2.0.0 is also registered. */
  getVersion(identifier: string, version: string): IndicatorDefinition;
  /** Every registered version of one identifier, ordered oldest to newest — item 7's "the registry must support multiple versions," made queryable, not just structurally possible. */
  listVersions(identifier: string): IndicatorDefinition[];
  listByCategory(category: IndicatorCategory): IndicatorDefinition[];
  listByTag(tag: string): IndicatorDefinition[];
  listAll(): IndicatorDefinition[];
}
