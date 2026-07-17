import { Injectable } from "@nestjs/common";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { StrategyNotFoundException } from "../errors/application.errors";

export class ArchiveStrategyCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyId: string,
    public readonly actorId: string,
  ) {}
}

/**
 * Covers item "DeleteStrategy" too — the domain's own `Strategy`
 * aggregate has no hard-delete method at all (`strategy.aggregate.ts`'s
 * own `archive()` is the only terminal-state transition it exposes),
 * matching this platform's own established soft-delete-only convention
 * since EP-002. `DELETE /strategies/:id` (the REST endpoint this
 * milestone's own route list names) maps to THIS operation, not a real
 * row deletion — named explicitly here rather than silently
 * implementing a literal hard delete the domain doesn't support.
 */
@Injectable()
export class ArchiveStrategyHandler {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly historyRecorder: HistoryRecorderService,
  ) {}

  async execute(command: ArchiveStrategyCommand): Promise<Strategy> {
    const strategy = await this.strategyRepository.findById(command.strategyId, command.organizationId);
    if (!strategy) {
      throw new StrategyNotFoundException(`No strategy "${command.strategyId}" in this organization.`, { strategyId: command.strategyId });
    }

    strategy.archive();
    await this.strategyRepository.save(strategy);
    await this.historyRecorder.record(strategy.id, "STRATEGY_ARCHIVED", command.actorId);
    return strategy;
  }
}
