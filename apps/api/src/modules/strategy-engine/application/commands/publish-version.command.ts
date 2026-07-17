import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { StrategyPublication } from "../../domain/entities/strategy-publication.entity";
import type { StrategyPublishedEvent, StrategyVersionPublishedEvent } from "../../domain/events/strategy-domain-events.interface";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import { StrategyPublicationRepository } from "../../infrastructure/repositories/strategy-publication.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { StrategyNotFoundException, StrategyVersionNotFoundException, VersionNotApprovedException } from "../errors/application.errors";
import { EVENT_PUBLISHER, type EventPublisher } from "../events/event-publisher.interface";

export class PublishVersionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyVersionId: string,
    public readonly publishedByUserId: string,
    public readonly correlationId?: string,
  ) {}
}

/**
 * The real operation behind BOTH `POST /strategies/:id/publish` and
 * `POST /versions/:id/publish` (this milestone's own route list names
 * both) — one handler, called two ways: directly with an explicit
 * `strategyVersionId`, or via the strategy-level controller endpoint
 * resolving "this strategy's own latest APPROVED version" first, then
 * calling this same handler. Real coordination across THREE things,
 * all updated together: the version itself (APPROVED -> PUBLISHED), a
 * new `StrategyPublication` record (the historical fact of publishing,
 * naming what it supersedes), and the parent `Strategy`'s own
 * `currentPublishedVersionId` pointer — plus, if a prior version was
 * published, that OLDER version transitions PUBLISHED -> SUPERSEDED,
 * so at most one version is ever `PUBLISHED` for a given strategy at
 * once. Milestone 4: publishes BOTH `StrategyPublishedEvent` (the
 * strategy-level view) and `StrategyVersionPublishedEvent` (the
 * version-level view) from the same real publish operation — "support
 * multiple events within a transaction" (this milestone's own rule),
 * the identical dual-view precedent Milestone 3 already established
 * for the dual REST endpoints.
 */
@Injectable()
export class PublishVersionHandler {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly versionRepository: StrategyVersionRepository,
    private readonly publicationRepository: StrategyPublicationRepository,
    private readonly historyRecorder: HistoryRecorderService,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: PublishVersionCommand): Promise<StrategyPublication> {
    const version = await this.versionRepository.findById(command.strategyVersionId, command.organizationId);
    if (!version) {
      throw new StrategyVersionNotFoundException(`No strategy version "${command.strategyVersionId}" in this organization.`, { strategyVersionId: command.strategyVersionId });
    }
    if (version.status !== "APPROVED") {
      throw new VersionNotApprovedException(`Strategy version "${version.id}" is "${version.status}", not APPROVED — only an approved version can be published.`, { strategyVersionId: version.id, status: version.status });
    }

    const strategy = await this.strategyRepository.findById(version.strategyId, command.organizationId);
    if (!strategy) {
      throw new StrategyNotFoundException(`No strategy "${version.strategyId}" in this organization.`, { strategyId: version.strategyId });
    }

    const previouslyPublishedVersionId = strategy.currentPublishedVersionId;
    if (previouslyPublishedVersionId) {
      const previous = await this.versionRepository.findById(previouslyPublishedVersionId, command.organizationId);
      if (previous) {
        previous.transitionTo("SUPERSEDED");
        await this.versionRepository.save(previous);
      }
    }

    version.transitionTo("PUBLISHED");
    await this.versionRepository.save(version);

    strategy.recordPublishedVersion(version.id);
    await this.strategyRepository.save(strategy);

    const publication = new StrategyPublication(randomUUID(), version.id, command.publishedByUserId, new Date(), previouslyPublishedVersionId);
    await this.publicationRepository.save(publication);
    await this.historyRecorder.record(strategy.id, "VERSION_PUBLISHED", command.publishedByUserId, { versionId: version.id, versionNumber: version.versionNumber, supersedesVersionId: previouslyPublishedVersionId });

    const correlationId = command.correlationId ?? randomUUID();
    const now = new Date();
    const strategyEvent: StrategyPublishedEvent = { kind: "StrategyPublished", organizationId: strategy.organizationId, strategyId: strategy.id, actorId: command.publishedByUserId, occurredAt: now, strategyVersionId: version.id, versionNumber: version.versionNumber, supersedesVersionId: previouslyPublishedVersionId };
    const versionEvent: StrategyVersionPublishedEvent = { kind: "StrategyVersionPublished", organizationId: strategy.organizationId, strategyId: strategy.id, actorId: command.publishedByUserId, occurredAt: now, strategyVersionId: version.id, versionNumber: version.versionNumber, supersedesVersionId: previouslyPublishedVersionId };
    await this.eventPublisher.publish([strategyEvent, versionEvent], correlationId, correlationId);

    return publication;
  }
}
