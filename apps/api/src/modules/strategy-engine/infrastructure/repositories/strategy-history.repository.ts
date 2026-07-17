import { Injectable } from "@nestjs/common";
import { prisma } from "@rmsm/database";
import { StrategyHistoryEntry } from "../../domain/entities/strategy-history.entity";
import type { StrategyHistoryRepository as StrategyHistoryRepositoryInterface } from "../../domain/repositories/strategy-history.repository.interface";
import { toStrategyHistoryDomain, toStrategyHistoryPersistence } from "../mappers/strategy-history.mapper";

@Injectable()
export class StrategyHistoryRepository implements StrategyHistoryRepositoryInterface {
  async listByStrategy(strategyId: string, organizationId: string): Promise<StrategyHistoryEntry[]> {
    const rows = await prisma.strategyHistory.findMany({ where: { strategyId, organizationId }, orderBy: { occurredAt: "desc" } });
    return rows.map(toStrategyHistoryDomain);
  }

  /** Append-only, per this entity's own name and this milestone's own "Audit History" requirement — no update method exists on this repository at all, not just "save() happens to always create." */
  async append(entry: StrategyHistoryEntry): Promise<void> {
    const strategy = await prisma.strategy.findUniqueOrThrow({ where: { id: entry.strategyId } });
    await prisma.strategyHistory.create({ data: toStrategyHistoryPersistence(entry, strategy.organizationId) });
  }
}
