import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Strategy } from "../../domain/aggregates/strategy.aggregate";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { StrategyRepository } from "../../infrastructure/repositories/strategy.repository";
import { StrategyVersionRepository } from "../../infrastructure/repositories/strategy-version.repository";
import { HistoryRecorderService } from "../services/history-recorder.service";
import { RuleTreeClonerService } from "../services/rule-tree-cloner.service";
import { StrategyNotFoundException, DuplicateSlugException } from "../errors/application.errors";
import { slugify } from "../../infrastructure/mappers/slug.util";

export class CloneStrategyCommand {
  constructor(
    public readonly organizationId: string,
    public readonly sourceStrategyId: string,
    public readonly newName: string,
    public readonly actorId: string,
  ) {}
}

/** Clones a Strategy's own top-level metadata (name/description/category — tags are deliberately NOT copied, a real choice: tags like "backtested-2026" describe the SOURCE strategy's own history, not the clone's) plus its LATEST version's own rule tree and parameters, via a fresh DRAFT version — never the published version's own row itself, preserving the domain's own "a version's identity is tied to one strategy" invariant. */
@Injectable()
export class CloneStrategyHandler {
  constructor(
    private readonly strategyRepository: StrategyRepository,
    private readonly versionRepository: StrategyVersionRepository,
    private readonly historyRecorder: HistoryRecorderService,
    private readonly treeCloner: RuleTreeClonerService,
  ) {}

  async execute(command: CloneStrategyCommand): Promise<Strategy> {
    const source = await this.strategyRepository.findById(command.sourceStrategyId, command.organizationId);
    if (!source) {
      throw new StrategyNotFoundException(`No strategy "${command.sourceStrategyId}" in this organization.`, { strategyId: command.sourceStrategyId });
    }

    const slug = slugify(command.newName);
    if (await this.strategyRepository.findBySlug(slug, command.organizationId)) {
      throw new DuplicateSlugException(`A strategy named "${command.newName}" already exists in this organization.`, { organizationId: command.organizationId, slug });
    }

    const clone = new Strategy(randomUUID(), command.organizationId, command.newName, source.description, source.category, [], "ACTIVE", null, command.actorId, new Date());
    await this.strategyRepository.save(clone);
    await this.historyRecorder.record(clone.id, "STRATEGY_CREATED", command.actorId, { clonedFrom: source.id });

    const sourceVersions = await this.versionRepository.listByStrategy(source.id, command.organizationId);
    const latestSourceVersion = sourceVersions[0];
    if (latestSourceVersion) {
      const clonedVersion = new StrategyVersion(
        randomUUID(),
        clone.id,
        1,
        "DRAFT",
        this.treeCloner.clone(latestSourceVersion.entryRules),
        this.treeCloner.clone(latestSourceVersion.exitRules),
        [...latestSourceVersion.parameters],
        command.actorId,
        new Date(),
      );
      await this.versionRepository.save(clonedVersion);
      await this.historyRecorder.record(clone.id, "VERSION_DRAFTED", command.actorId, { versionId: clonedVersion.id, clonedFromVersionId: latestSourceVersion.id });
    }

    return clone;
  }
}
