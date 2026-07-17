import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import type { StrategyParameterDefinition } from "../../domain/value-objects/strategy-parameter.value-object";
import type { StrategyVersionCreatedEvent } from "../../domain/events/strategy-domain-events.interface";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { StrategyNotFoundException } from "../errors/application.errors";
import { EVENT_PUBLISHER, type EventPublisher } from "../events/event-publisher.interface";

export class CreateVersionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyId: string,
    public readonly entryRules: RuleGroup,
    public readonly exitRules: RuleGroup,
    public readonly parameters: StrategyParameterDefinition[],
    public readonly actorId: string,
    public readonly correlationId?: string,
  ) {}
}

@Injectable()
export class CreateVersionHandler {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly versionRepository: StrategyVersionRepository,
    private readonly historyRecorder: HistoryRecorderService,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateVersionCommand): Promise<StrategyVersion> {
    const strategy = await this.strategyRepository.findById(command.strategyId, command.organizationId);
    if (!strategy) {
      throw new StrategyNotFoundException(`No strategy "${command.strategyId}" in this organization.`, { strategyId: command.strategyId });
    }

    const versionNumber = await this.versionRepository.nextVersionNumber(command.strategyId, command.organizationId);
    const version = new StrategyVersion(randomUUID(), command.strategyId, versionNumber, "DRAFT", command.entryRules, command.exitRules, command.parameters, command.actorId, new Date());
    await this.versionRepository.save(version);
    await this.historyRecorder.record(strategy.id, "VERSION_DRAFTED", command.actorId, { versionId: version.id, versionNumber });

    const correlationId = command.correlationId ?? randomUUID();
    const event: StrategyVersionCreatedEvent = { kind: "StrategyVersionCreated", organizationId: strategy.organizationId, strategyId: strategy.id, actorId: command.actorId, occurredAt: new Date(), strategyVersionId: version.id, versionNumber };
    await this.eventPublisher.publish([event], correlationId, correlationId);

    return version;
  }
}
