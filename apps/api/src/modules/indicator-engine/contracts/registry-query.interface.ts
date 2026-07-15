import type { IndicatorDefinition } from "./indicator-definition.interface";
import type { IndicatorCategory } from "./indicator-category.enum";
import type { IndicatorTimeframe } from "./timeframe";
import type { IndicatorCalculationType } from "./indicator-metadata.interface";

/**
 * Discovery (item 9) — a richer query surface than
 * `IndicatorRegistry`'s own basic lookup methods
 * (`get`/`tryGet`/`listByCategory`/`listAll`), composed from them
 * rather than duplicating the registry's own storage. A real Phase 2A
 * implementation (`registry/registry-query.service.ts`, Phase 2B+)
 * wraps an `IndicatorRegistry` instance and filters/searches over
 * `listAll()`'s result — this is a read-only VIEW over the registry,
 * never a second place indicator definitions are stored.
 */
export interface IndicatorDiscoveryFilter {
  category?: IndicatorCategory;
  tags?: string[];
  timeframe?: IndicatorTimeframe;
  /** "lookup by capability" (item 9's own wording) — e.g. find every definition whose embedded IndicatorMetadata declares incrementalSupport, or a specific calculationType. */
  capability?: { incrementalSupport?: boolean; cacheable?: boolean; calculationType?: IndicatorCalculationType };
  version?: string;
}

export interface RegistryQuery {
  search(filter: IndicatorDiscoveryFilter): IndicatorDefinition[];
}
