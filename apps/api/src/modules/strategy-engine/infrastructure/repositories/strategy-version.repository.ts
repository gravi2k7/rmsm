import { Injectable } from "@nestjs/common";
import { prisma } from "@rmsm/database";
import type { StrategyVersion as StrategyVersionRow } from "@rmsm/database";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import type { StrategyVersionRepository as StrategyVersionRepositoryInterface } from "../../domain/repositories/strategy-version.repository.interface";
import { toStrategyVersionDomain, toStrategyVersionPersistence, flattenStrategyVersionTrees } from "../mappers/strategy-version.mapper";
import { toConditionPersistence } from "../mappers/condition.mapper";
import { toRulePersistence } from "../mappers/rule.mapper";
import { toStrategyParameterPersistence } from "../mappers/strategy-parameter.mapper";

/**
 * `save()` uses a real, deliberate simplification: the owned rule tree
 * and parameter set are FULLY REPLACED on every save (delete every
 * existing RuleGroup/Rule/Condition/StrategyParameter row for this
 * version, then insert the current in-memory tree fresh) rather than
 * diffed node-by-node. A `StrategyVersion` is immutable once
 * PUBLISHED (the aggregate's own enforced invariant,
 * `strategy-version.aggregate.ts`), so this method only ever runs
 * against a mutable DRAFT-family version — a full replace is genuinely
 * simpler and no less correct than a tree diff for that case, and the
 * whole operation runs inside one transaction (this milestone's own
 * "maintain aggregate consistency" rule), so there's no window where a
 * partial tree could be read by another request.
 */
@Injectable()
export class StrategyVersionRepository implements StrategyVersionRepositoryInterface {
  async findById(id: string, organizationId: string): Promise<StrategyVersion | null> {
    const row = await prisma.strategyVersion.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!row) return null;
    return this.hydrate(row);
  }

  async findByStrategyAndNumber(strategyId: string, versionNumber: number, organizationId: string): Promise<StrategyVersion | null> {
    const row = await prisma.strategyVersion.findFirst({ where: { strategyId, versionNumber, organizationId, deletedAt: null } });
    if (!row) return null;
    return this.hydrate(row);
  }

  async listByStrategy(strategyId: string, organizationId: string): Promise<StrategyVersion[]> {
    const rows = await prisma.strategyVersion.findMany({ where: { strategyId, organizationId, deletedAt: null }, orderBy: { versionNumber: "desc" } });
    return Promise.all(rows.map((row: StrategyVersionRow) => this.hydrate(row)));
  }

  async nextVersionNumber(strategyId: string, organizationId: string): Promise<number> {
    const latest = await prisma.strategyVersion.findFirst({ where: { strategyId, organizationId }, orderBy: { versionNumber: "desc" } });
    return (latest?.versionNumber ?? 0) + 1;
  }

  async save(version: StrategyVersion): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const organizationId = await this.resolveOrganizationId(version, tx);
      const persistenceData = toStrategyVersionPersistence(version, organizationId, version.createdByUserId);
      const existing = await tx.strategyVersion.findUnique({ where: { id: version.id } });

      if (existing) {
        const result = await tx.strategyVersion.updateMany({ where: { id: version.id, version: existing.version }, data: { ...persistenceData, version: { increment: 1 } } });
        if (result.count === 0) {
          throw new Error(`Optimistic concurrency conflict saving StrategyVersion ${version.id} — it was modified by another writer since it was read.`);
        }
      } else {
        await tx.strategyVersion.create({ data: { ...persistenceData, createdById: version.createdByUserId, createdAt: version.createdAt } });
      }

      // Full replace — see this class's own header comment.
      await tx.condition.deleteMany({ where: { rule: { ruleGroup: { strategyVersionId: version.id } } } });
      await tx.rule.deleteMany({ where: { ruleGroup: { strategyVersionId: version.id } } });
      await tx.ruleGroup.deleteMany({ where: { strategyVersionId: version.id } });
      await tx.strategyParameter.deleteMany({ where: { strategyVersionId: version.id } });

      const { groups, rules } = flattenStrategyVersionTrees(version, organizationId);

      for (const groupData of groups) {
        await tx.ruleGroup.create({ data: groupData });
      }
      for (const { rule, ruleGroupId, sortOrder } of rules) {
        await tx.rule.create({ data: toRulePersistence(rule, organizationId, ruleGroupId, sortOrder) });
        await tx.condition.create({ data: toConditionPersistence(rule.condition, organizationId, rule.id) });
      }

      await tx.strategyParameter.createMany({ data: version.parameters.map((p, index) => toStrategyParameterPersistence(p, organizationId, version.id, index)) });
    });
  }

  /** organizationId isn't known to the StrategyVersion aggregate itself — a deliberate domain-model boundary (see that aggregate's own file: it's referenced by strategyId, org-scoping lives on the parent Strategy). Resolved here from the parent Strategy row rather than threading a redundant field through the aggregate's own constructor. */
  private async resolveOrganizationId(version: StrategyVersion, tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]): Promise<string> {
    const strategy = await tx.strategy.findUniqueOrThrow({ where: { id: version.strategyId } });
    return strategy.organizationId;
  }

  private async hydrate(row: StrategyVersionRow): Promise<StrategyVersion> {
    const [ruleGroupRows, ruleRows, parameterRows] = await Promise.all([
      prisma.ruleGroup.findMany({ where: { strategyVersionId: row.id, deletedAt: null } }),
      prisma.rule.findMany({ where: { ruleGroup: { strategyVersionId: row.id }, deletedAt: null }, include: { condition: true } }),
      prisma.strategyParameter.findMany({ where: { strategyVersionId: row.id, deletedAt: null } }),
    ]);

    return toStrategyVersionDomain(row, ruleGroupRows, ruleRows, parameterRows, row.createdById ?? "");
  }
}
