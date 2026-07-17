import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { RuleTreeClonerService } from "../services/rule-tree-cloner.service";
import { StrategyVersionNotFoundException } from "../errors/application.errors";

export class RollbackVersionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly strategyId: string,
    public readonly targetVersionId: string,
    public readonly actorId: string,
  ) {}
}

/**
 * "Rollback" does NOT resurrect the old version's own row — a
 * `StrategyVersion` is permanently immutable once it moves past
 * `PUBLISHED` (the aggregate's own enforced invariant), so an already-
 * `SUPERSEDED` version can never legally become `PUBLISHED` again
 * directly (`VERSION_STATUS_TRANSITIONS`'s own table has no such
 * edge). Instead, this creates a brand-new DRAFT version whose rule
 * tree and parameters are a fresh copy of the target version's own
 * content (via `RuleTreeClonerService`, the same real cloning
 * `CloneStrategy` uses) — the new version then goes through the
 * normal draft -> validate -> approve -> publish cycle again like any
 * other version, which is the only way this domain model allows an
 * older version's own content to become active again, and a real,
 * deliberate one (an org's approval workflow still governs "reverting"
 * a strategy, not a shortcut around it).
 */
@Injectable()
export class RollbackVersionHandler {
  constructor(
    private readonly versionRepository: StrategyVersionRepository,
    private readonly historyRecorder: HistoryRecorderService,
    private readonly treeCloner: RuleTreeClonerService,
  ) {}

  async execute(command: RollbackVersionCommand): Promise<StrategyVersion> {
    const target = await this.versionRepository.findById(command.targetVersionId, command.organizationId);
    if (!target) {
      throw new StrategyVersionNotFoundException(`No strategy version "${command.targetVersionId}" in this organization.`, { strategyVersionId: command.targetVersionId });
    }

    const versionNumber = await this.versionRepository.nextVersionNumber(command.strategyId, command.organizationId);
    const rolledBack = new StrategyVersion(
      randomUUID(),
      command.strategyId,
      versionNumber,
      "DRAFT",
      this.treeCloner.clone(target.entryRules),
      this.treeCloner.clone(target.exitRules),
      [...target.parameters],
      command.actorId,
      new Date(),
    );
    await this.versionRepository.save(rolledBack);
    await this.historyRecorder.record(command.strategyId, "VERSION_DRAFTED", command.actorId, { versionId: rolledBack.id, versionNumber, rolledBackFromVersionId: target.id });
    return rolledBack;
  }
}
