import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import type { StrategyCategory } from "../../domain/value-objects/strategy-category.value-object";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { DuplicateSlugException } from "../errors/application.errors";
import { slugify } from "../../infrastructure/mappers/slug.util";

export class CreateStrategyCommand {
  constructor(
    public readonly organizationId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly category: StrategyCategory,
    public readonly createdByUserId: string,
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
 */
@Injectable()
export class CreateStrategyHandler {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly historyRecorder: HistoryRecorderService,
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
    return strategy;
  }
}
