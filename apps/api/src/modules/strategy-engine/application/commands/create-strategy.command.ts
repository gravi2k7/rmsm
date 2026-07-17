import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import type { StrategyCategory } from "../../domain/value-objects/strategy-category.value-object";
import type { StrategyCreatedEvent } from "../../domain/events/strategy-domain-events.interface";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { DuplicateSlugException } from "../errors/application.errors";
import { slugify } from "../../infrastructure/mappers/slug.util";
import { EVENT_PUBLISHER, type EventPublisher } from "../events/event-publisher.interface";

export class CreateStrategyCommand {
  constructor(
    public readonly organizationId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly category: StrategyCategory,
    public readonly createdByUserId: string,
    /** The platform's own request correlation id (AI-101 Phase 5's `RequestIdMiddleware`, threaded from the controller — the same pattern AI-102 Phase 5 established for `ExecuteIndicatorRequest.requestId`). Falls back to a fresh id when absent (a direct handler call outside an HTTP request, e.g. a future background job). */
    public readonly correlationId?: string,
  ) {}
}

/**
 * Hand-rolled CQRS (a real Command class + a real, single-purpose
 * Handler class per command) — deliberately NOT the `@nestjs/cqrs`
 * package's `CommandBus`/`@CommandHandler` machinery. No prior module
 * in this platform (EP, AI-101, AI-102) has used that library; adopting
 * it here would introduce a genuinely new architectural pattern
 * (bus-dispatched, decoupled handler resolution) this milestone's own
 * "do NOT redesign" spirit argues against. This gets the real benefit
 * CQRS is asked for here — separated read/write logic, one handler per
 * use case, easy to test in isolation — without a new dependency or a
 * new dispatch mechanism the rest of the platform doesn't share.
 *
 * Milestone 4 addition: publishes a real `StrategyCreatedEvent` AFTER
 * `strategyRepository.save()` succeeds — "Publish events only after
 * successful transactions... never publish failed operations" (this
 * milestone's own explicit rule), verified structurally here: the
 * `publish()` call is the LAST statement, after every operation that
 * could throw has already succeeded.
 */
@Injectable()
export class CreateStrategyHandler {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly historyRecorder: HistoryRecorderService,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateStrategyCommand): Promise<Strategy> {
    const slug = slugify(command.name);
    const existing = await this.strategyRepository.findBySlug(slug, command.organizationId);
    if (existing) {
      throw new DuplicateSlugException(`A strategy named "${command.name}" already exists in this organization.`, { organizationId: command.organizationId, slug });
    }

    const strategy = new Strategy(randomUUID(), command.organizationId, command.name, command.description, command.category, [], "ACTIVE", null, command.createdByUserId, new Date());
    await this.strategyRepository.save(strategy);
    await this.historyRecorder.record(strategy.id, "STRATEGY_CREATED", command.createdByUserId, { name: command.name, category: command.category });

    const correlationId = command.correlationId ?? randomUUID();
    const event: StrategyCreatedEvent = { kind: "StrategyCreated", organizationId: strategy.organizationId, strategyId: strategy.id, actorId: command.createdByUserId, occurredAt: new Date(), name: strategy.name, category: strategy.category };
    await this.eventPublisher.publish([event], correlationId, correlationId);

    return strategy;
  }
}
