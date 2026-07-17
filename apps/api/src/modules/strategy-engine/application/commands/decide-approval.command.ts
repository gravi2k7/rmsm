import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { StrategyApproval } from "../../domain/entities/strategy-approval.entity";
import type { StrategyApprovedEvent, StrategyRejectedEvent } from "../../domain/events/strategy-domain-events.interface";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import { StrategyApprovalRepository } from "../../infrastructure/repositories/strategy-approval.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { StrategyVersionNotFoundException, NoPendingApprovalException } from "../errors/application.errors";
import { EVENT_PUBLISHER, type EventPublisher } from "../events/event-publisher.interface";

export class DecideApprovalCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyVersionId: string,
    public readonly decision: "APPROVED" | "REJECTED",
    public readonly decidedByUserId: string,
    public readonly comments?: string,
    public readonly correlationId?: string,
  ) {}
}

/**
 * Covers BOTH "ApproveStrategy" and "RejectStrategy" (Application
 * Services list) — one handler, one decision parameter, not two
 * near-identical handler classes differing only in which literal they
 * pass to the same domain transition. Approve/Reject are the same
 * OPERATION (a human decision on a pending approval) with two possible
 * outcomes, not two different operations — the same reasoning
 * `StrategyApproval`'s own entity design already reflects (one
 * `decision` field, not two boolean flags). Publishes the REAL event
 * matching whichever outcome actually happened — never both.
 */
@Injectable()
export class DecideApprovalHandler {
  constructor(
    private readonly versionRepository: StrategyVersionRepository,
    private readonly approvalRepository: StrategyApprovalRepository,
    private readonly historyRecorder: HistoryRecorderService,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: DecideApprovalCommand): Promise<StrategyApproval> {
    const version = await this.versionRepository.findById(command.strategyVersionId, command.organizationId);
    if (!version) {
      throw new StrategyVersionNotFoundException(`No strategy version "${command.strategyVersionId}" in this organization.`, { strategyVersionId: command.strategyVersionId });
    }

    const pending = await this.approvalRepository.findPendingByStrategyVersion(version.id, command.organizationId);
    if (!pending) {
      throw new NoPendingApprovalException(`Strategy version "${version.id}" has no pending approval request.`, { strategyVersionId: version.id });
    }

    const decided = new StrategyApproval(pending.id, pending.strategyVersionId, pending.requestedByUserId, pending.requestedAt, command.decision, command.decidedByUserId, new Date(), command.comments);
    await this.approvalRepository.save(decided);

    version.transitionTo(command.decision);
    await this.versionRepository.save(version);

    await this.historyRecorder.record(version.strategyId, command.decision === "APPROVED" ? "VERSION_APPROVED" : "VERSION_REJECTED", command.decidedByUserId, { versionId: version.id, approvalId: decided.id, comments: command.comments });

    const correlationId = command.correlationId ?? randomUUID();
    const event: StrategyApprovedEvent | StrategyRejectedEvent =
      command.decision === "APPROVED"
        ? { kind: "StrategyApproved", organizationId: command.organizationId, strategyId: version.strategyId, actorId: command.decidedByUserId, occurredAt: new Date(), strategyVersionId: version.id, approvalId: decided.id, decidedByUserId: command.decidedByUserId }
        : { kind: "StrategyRejected", organizationId: command.organizationId, strategyId: version.strategyId, actorId: command.decidedByUserId, occurredAt: new Date(), strategyVersionId: version.id, approvalId: decided.id, decidedByUserId: command.decidedByUserId, comments: command.comments };
    await this.eventPublisher.publish([event], correlationId, correlationId);

    return decided;
  }
}
