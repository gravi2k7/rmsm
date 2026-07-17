import type { StrategyHistoryEntry } from "../entities/strategy-history.entity";

export interface StrategyHistoryRepository {
  listByStrategy(strategyId: string, organizationId: string): Promise<StrategyHistoryEntry[]>;
  append(entry: StrategyHistoryEntry): Promise<void>;
}
