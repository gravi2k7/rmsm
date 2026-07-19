import type { Strategy, StrategyLifecycleStatus } from "../entities/strategy";
import type { StrategyId } from "../value-objects/strategy-id";

/** Persistence port for `Strategy` aggregates — interface only, per this
 * package's own design rules ("No Prisma. No database implementation.
 * Repository Interface only."). A real implementation lives in whatever
 * infrastructure layer consumes this package. */
export interface StrategyRepository {
  findById(id: StrategyId): Promise<Strategy | null>;
  findByStatus(status: StrategyLifecycleStatus): Promise<Strategy[]>;
  findEnabled(): Promise<Strategy[]>;
  save(strategy: Strategy): Promise<void>;
}
