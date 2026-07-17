import type { StrategyVersion as StrategyVersionRow, StrategyParameter as StrategyParameterRow, RuleGroup as RuleGroupRow, RuleWithCondition } from "@rmsm/database";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { buildRuleGroupTree, flattenRuleGroupTree } from "./rule-group.mapper";
import { toStrategyParameterDomain } from "./strategy-parameter.mapper";
import { toPrismaVersionStatus, toDomainVersionStatus } from "./enum-mappers.util";

/**
 * The full aggregate mapper — combines a `StrategyVersion` row with its
 * OWNED tree data (entry/exit rule groups, parameters), all fetched
 * separately by the repository (flat queries, per `rule-group.mapper.ts`'s
 * own reasoning) and assembled here into one real domain object.
 * Milestone 2 fix applied — `status` now goes through the exhaustive
 * enum-mappers.util.ts translation instead of a blind `as` cast.
 */
export function toStrategyVersionDomain(row: StrategyVersionRow, ruleGroupRows: RuleGroupRow[], ruleRows: RuleWithCondition[], parameterRows: StrategyParameterRow[], createdByUserId: string): StrategyVersion {
  const entryRules = buildRuleGroupTree(ruleGroupRows, ruleRows, "ENTRY");
  const exitRules = buildRuleGroupTree(ruleGroupRows, ruleRows, "EXIT");
  const parameters = parameterRows.sort((a, b) => a.sortOrder - b.sortOrder).map(toStrategyParameterDomain);

  return new StrategyVersion(row.id, row.strategyId, row.versionNumber, toDomainVersionStatus(row.status), entryRules, exitRules, parameters, createdByUserId, row.createdAt);
}

export function toStrategyVersionPersistence(version: StrategyVersion, organizationId: string, updatedById: string | null) {
  return {
    id: version.id,
    organizationId,
    strategyId: version.strategyId,
    versionNumber: version.versionNumber,
    status: toPrismaVersionStatus(version.status),
    updatedById,
  };
}

/** Both rule trees (entry + exit) flattened together — a repository's own save() persists this in one coherent batch, per this milestone's own "use Prisma transactions where required, maintain aggregate consistency" rule. */
export function flattenStrategyVersionTrees(version: StrategyVersion, organizationId: string) {
  const entry = flattenRuleGroupTree(version.entryRules, version.id, organizationId, "ENTRY");
  const exit = flattenRuleGroupTree(version.exitRules, version.id, organizationId, "EXIT");
  return {
    groups: [...entry.groups, ...exit.groups],
    rules: [...entry.rules, ...exit.rules],
  };
}
