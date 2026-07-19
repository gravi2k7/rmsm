import { Injectable } from "@nestjs/common";
import type { StrategyRepository, Strategy, StrategyLifecycleStatus, StrategyId } from "@rmsm/strategy";

/**
 * In-memory `StrategyRepository`. Deliberately implements *only* the
 * interface's own methods — no extra `findAll()` convenience — so every
 * query handler in the application layer depends solely on
 * `StrategyRepository` (injected by interface, not by this concrete
 * class), which is the whole point of the interface existing: a future
 * Prisma-backed implementation swaps in with zero handler changes. See
 * `ListStrategiesQueryHandler` for how "list every strategy regardless
 * of status" is built from `findByStatus()` alone.
 */
@Injectable()
export class InMemoryStrategyRepository implements StrategyRepository {
  private readonly strategies = new Map<string, Strategy>();

  async findById(id: StrategyId): Promise<Strategy | null> {
    return this.strategies.get(id.value) ?? null;
  }

  async findByStatus(status: StrategyLifecycleStatus): Promise<Strategy[]> {
    return Array.from(this.strategies.values()).filter((s) => s.status === status);
  }

  async findEnabled(): Promise<Strategy[]> {
    return Array.from(this.strategies.values()).filter((s) => s.enabled);
  }

  async save(strategy: Strategy): Promise<void> {
    this.strategies.set(strategy.id.value, strategy);
  }
}
