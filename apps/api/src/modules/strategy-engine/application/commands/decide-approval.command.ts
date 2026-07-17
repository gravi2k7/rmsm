import { Injectable } from "@nestjs/common";
import { StrategyApproval } from "../../domain/entities/strategy-approval.entity";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import { StrategyApprovalRepository } from "../../infrastructure/repositories/strategy-approval.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { StrategyVersionNotFoundException, NoPendingApprovalException } from "../errors/application.errors";

export class DecideApprovalCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyVersionId: string,
    public readonly decision: "APPROVED" | "REJECTED",
    public readonly decidedByUserId: string,
    public readonly comments?: string,
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
 * `decision` field, not two boolean flags).
 */
@Injectable()
export class DecideApprovalHandler {
  constructor(
    private readonly versionRepository: StrategyVersionRepository,
    private readonly approvalRepository: StrategyApprovalRepository,
    private readonly historyRecorder: HistoryRecorderService,
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
    return decided;
  }
}
