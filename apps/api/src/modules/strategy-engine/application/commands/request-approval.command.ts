import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { StrategyApproval } from "../../domain/entities/strategy-approval.entity";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import { StrategyApprovalRepository } from "../../infrastructure/repositories/strategy-approval.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { StrategyVersionNotFoundException } from "../errors/application.errors";

export class RequestApprovalCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyVersionId: string,
    public readonly requestedByUserId: string,
  ) {}
}

@Injectable()
export class RequestApprovalHandler {
  constructor(
    private readonly versionRepository: StrategyVersionRepository,
    private readonly approvalRepository: StrategyApprovalRepository,
    private readonly historyRecorder: HistoryRecorderService,
  ) {}

  async execute(command: RequestApprovalCommand): Promise<StrategyApproval> {
    const version = await this.versionRepository.findById(command.strategyVersionId, command.organizationId);
    if (!version) {
      throw new StrategyVersionNotFoundException(`No strategy version "${command.strategyVersionId}" in this organization.`, { strategyVersionId: command.strategyVersionId });
    }

    version.transitionTo("PENDING_APPROVAL");
    await this.versionRepository.save(version);

    const approval = new StrategyApproval(randomUUID(), version.id, command.requestedByUserId, new Date(), "PENDING");
    await this.approvalRepository.save(approval);
    await this.historyRecorder.record(version.strategyId, "VERSION_APPROVAL_REQUESTED", command.requestedByUserId, { versionId: version.id, approvalId: approval.id });
    return approval;
  }
}
