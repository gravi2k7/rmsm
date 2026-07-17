import { Injectable } from "@nestjs/common";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { StrategyNotFoundException } from "../errors/application.errors";

export class UpdateStrategyCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyId: string,
    public readonly actorId: string,
    public readonly name?: string,
    public readonly description?: string,
    public readonly addTags?: string[],
    public readonly removeTags?: string[],
  ) {}
}

/** Covers item "AssignTags" too — a real, deliberate consolidation: adding/removing tags is part of the SAME "update a strategy's own metadata" operation the domain's own `Strategy` aggregate already exposes as separate methods (`addTag`/`removeTag`/`rename`/`updateDescription`), not a reason for a wholly separate command with its own duplicate not-found/not-archived checks. */
@Injectable()
export class UpdateStrategyHandler {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly historyRecorder: HistoryRecorderService,
  ) {}

  async execute(command: UpdateStrategyCommand): Promise<Strategy> {
    const strategy = await this.strategyRepository.findById(command.strategyId, command.organizationId);
    if (!strategy) {
      throw new StrategyNotFoundException(`No strategy "${command.strategyId}" in this organization.`, { strategyId: command.strategyId });
    }

    const changedFields: string[] = [];
    if (command.name !== undefined) {
      strategy.rename(command.name);
      changedFields.push("name");
    }
    if (command.description !== undefined) {
      strategy.updateDescription(command.description);
      changedFields.push("description");
    }
    for (const tag of command.addTags ?? []) {
      strategy.addTag(tag);
      changedFields.push(`+tag:${tag}`);
    }
    for (const tag of command.removeTags ?? []) {
      strategy.removeTag(tag);
      changedFields.push(`-tag:${tag}`);
    }

    await this.strategyRepository.save(strategy);
    if (changedFields.length > 0) {
      await this.historyRecorder.record(strategy.id, "STRATEGY_UPDATED", command.actorId, { changedFields });
    }
    return strategy;
  }
}
