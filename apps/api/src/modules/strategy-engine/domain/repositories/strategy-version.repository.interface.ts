import type { StrategyVersion } from "../aggregates/strategy-version.aggregate";

export interface StrategyVersionRepository {
  findById(id: string, organizationId: string): Promise<StrategyVersion | null>;
  findByStrategyAndNumber(strategyId: string, versionNumber: number, organizationId: string): Promise<StrategyVersion | null>;
  listByStrategy(strategyId: string, organizationId: string): Promise<StrategyVersion[]>;
  save(version: StrategyVersion): Promise<void>;
  /** The next sequential version number for a strategy — genuinely needs a real query (max existing + 1), not something the aggregate can compute from data it doesn't have. */
  nextVersionNumber(strategyId: string, organizationId: string): Promise<number>;
}
