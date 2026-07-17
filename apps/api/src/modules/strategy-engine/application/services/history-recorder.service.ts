import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { StrategyHistoryEntry, StrategyHistoryAction } from "../../domain/entities/strategy-history.entity";
import { StrategyHistoryRepository } from "../../infrastructure/repositories/strategy-history.repository";

/**
 * Centralizes real `StrategyHistoryEntry` construction — every command
 * handler that mutates a `Strategy`/`StrategyVersion` calls this
 * instead of constructing its own entry inline, so the "how do I build
 * a real audit record" logic exists exactly once (this milestone's own
 * "no duplicated logic" discipline, the same one Milestone 2's own
 * mappers followed).
 */
@Injectable()
export class HistoryRecorderService {
  constructor(private readonly historyRepository: StrategyHistoryRepository) {}

  async record(strategyId: string, action: StrategyHistoryAction, actorId: string | null, metadata: Record<string, unknown> = {}): Promise<void> {
    const entry = new StrategyHistoryEntry(randomUUID(), strategyId, action, actorId, new Date(), metadata);
    await this.historyRepository.append(entry);
  }
}
