import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { StrategyValidation } from "../../domain/entities/strategy-validation.entity";
import type { StrategyValidatedEvent } from "../../domain/events/strategy-domain-events.interface";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import { StrategyValidationRepository } from "../../infrastructure/repositories/strategy-validation.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { StructuralValidationService } from "../services/structural-validation.service";
import { StrategyVersionNotFoundException } from "../errors/application.errors";
import { EVENT_PUBLISHER, type EventPublisher } from "../events/event-publisher.interface";

export class ValidateVersionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyVersionId: string,
    public readonly actorId: string,
    public readonly correlationId?: string,
  ) {}
}

/** Real, structural-only validation — see `StructuralValidationService`'s own header comment for why AI-102 cross-checks remain a named, deferred gap. A passing validation transitions the version DRAFT -> PENDING_VALIDATION -> VALIDATED in one call (both real transitions, not skipped); a failing one returns the version to DRAFT via the domain's own real "failed validation returns to DRAFT" transition rule (`strategy-status.enum.ts`'s own VERSION_STATUS_TRANSITIONS table). */
@Injectable()
export class ValidateVersionHandler {
  constructor(
    private readonly versionRepository: StrategyVersionRepository,
    private readonly validationRepository: StrategyValidationRepository,
    private readonly historyRecorder: HistoryRecorderService,
    private readonly validator: StructuralValidationService,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: ValidateVersionCommand): Promise<StrategyValidation> {
    const version = await this.versionRepository.findById(command.strategyVersionId, command.organizationId);
    if (!version) {
      throw new StrategyVersionNotFoundException(`No strategy version "${command.strategyVersionId}" in this organization.`, { strategyVersionId: command.strategyVersionId });
    }

    if (version.status === "DRAFT") {
      version.transitionTo("PENDING_VALIDATION");
    }

    const { passed, findings } = this.validator.validate(version);
    const validation = new StrategyValidation(randomUUID(), version.id, new Date(), passed, findings);
    await this.validationRepository.save(validation);

    version.transitionTo(passed ? "VALIDATED" : "DRAFT");
    await this.versionRepository.save(version);
    await this.historyRecorder.record(version.strategyId, "VERSION_VALIDATED", command.actorId, { versionId: version.id, passed, findingCount: findings.length });

    const correlationId = command.correlationId ?? randomUUID();
    const event: StrategyValidatedEvent = { kind: "StrategyValidated", organizationId: command.organizationId, strategyId: version.strategyId, actorId: command.actorId, occurredAt: new Date(), strategyVersionId: version.id, passed, findingCount: findings.length };
    await this.eventPublisher.publish([event], correlationId, correlationId);

    return validation;
  }
}
