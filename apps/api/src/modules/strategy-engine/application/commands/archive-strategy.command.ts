import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import type { StrategyArchivedEvent } from "../../domain/events/strategy-domain-events.interface";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { StrategyNotFoundException } from "../errors/application.errors";
import { EVENT_PUBLISHER, type EventPublisher } from "../events/event-publisher.interface";

export class ArchiveStrategyCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyId: string,
    public readonly actorId: string,
    public readonly correlationId?: string,
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
 * Publishes a real `StrategyArchivedEvent` — deliberately no
 * `StrategyDeletedEvent`, since that would describe an operation that
 * never actually happens (see the domain events file's own comment).
 */
@Injectable()
export class ArchiveStrategyHandler {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly historyRecorder: HistoryRecorderService,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ArchiveStrategyCommand): Promise<Strategy> {
    const strategy = await this.strategyRepository.findById(command.strategyId, command.organizationId);
    if (!strategy) {
      throw new StrategyNotFoundException(`No strategy "${command.strategyId}" in this organization.`, { strategyId: command.strategyId });
    }

    strategy.archive();
    await this.strategyRepository.save(strategy);
    await this.historyRecorder.record(strategy.id, "STRATEGY_ARCHIVED", command.actorId);

    const correlationId = command.correlationId ?? randomUUID();
    const event: StrategyArchivedEvent = { kind: "StrategyArchived", organizationId: strategy.organizationId, strategyId: strategy.id, actorId: command.actorId, occurredAt: new Date() };
    await this.eventPublisher.publish([event], correlationId, correlationId);

    return strategy;
  }
}
