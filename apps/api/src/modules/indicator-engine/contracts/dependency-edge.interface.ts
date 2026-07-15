import type { CalculationMode } from "./calculation-window.interface";

/**
 * One dependency relationship — item 1's "dependency edges," carrying
 * item 7's full "Dependency Metadata" list. `dependencyType` alone
 * captures both "dependency type" and "optional/required" (item 7 lists
 * them as two bullets, but required-vs-optional IS the type — a
 * consolidation flagged here rather than adding a second, redundant
 * boolean that could disagree with `dependencyType` itself).
 */
export type DependencyType = "required" | "optional";

export interface DependencyEdge {
  /** The dependent indicator's identifier (e.g. "macd"). */
  from: string;
  /** The dependency's identifier (e.g. "ema"). */
  to: string;
  dependencyType: DependencyType;
  /** A specific version constraint on the dependency, if any — undefined means "the dependency's latest registered version," the same default `IndicatorRegistryService.get()` (Phase 2A) already uses. */
  versionConstraint?: string;
  /** Lower runs first among otherwise-unordered siblings — a real tiebreaker for DependencyResolver.produceDependencyTree() when two dependencies have no ordering relationship to each other (unlike topological order, which IS enforced; this is a secondary, same-tier preference). */
  executionPriority: number;
  calculationMode?: CalculationMode;
  metadata: Record<string, unknown>;
}
