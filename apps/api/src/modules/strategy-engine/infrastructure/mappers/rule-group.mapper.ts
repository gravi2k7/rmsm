import type { RuleGroup as RuleGroupRow, RuleWithCondition, RuleTreeRole } from "@rmsm/database";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import { Rule } from "../../domain/entities/rule.entity";
import { toRuleDomain } from "./rule.mapper";
import { toPrismaLogicalOperator, toDomainLogicalOperator } from "./enum-mappers.util";

/**
 * Reconstructs an arbitrary-depth `RuleGroup` tree from 3 FLAT row
 * sets (every `RuleGroup` for a version, every `Rule`+`Condition` for
 * those groups) — see `@rmsm/database`'s own comment on why this is
 * flat queries + in-memory grouping rather than a Prisma nested
 * `include`, which can only express a fixed depth at the type level.
 * Correct for a tree of any real depth, not just however many levels
 * a hardcoded include happened to cover.
 *
 * Milestone 2 fix applied — `operator`/`treeRole` now go through the
 * exhaustive `enum-mappers.util.ts` translation instead of a blind
 * `as LogicalOperator`/raw-string cast.
 */
export function buildRuleGroupTree(groupRows: RuleGroupRow[], ruleRows: RuleWithCondition[], rootTreeRole: RuleTreeRole): RuleGroup {
  const rulesByGroupId = new Map<string, RuleWithCondition[]>();
  for (const ruleRow of ruleRows) {
    const existing = rulesByGroupId.get(ruleRow.ruleGroupId) ?? [];
    existing.push(ruleRow);
    rulesByGroupId.set(ruleRow.ruleGroupId, existing);
  }

  const childGroupsByParentId = new Map<string, RuleGroupRow[]>();
  for (const groupRow of groupRows) {
    if (groupRow.parentGroupId === null) continue;
    const existing = childGroupsByParentId.get(groupRow.parentGroupId) ?? [];
    existing.push(groupRow);
    childGroupsByParentId.set(groupRow.parentGroupId, existing);
  }

  const rootRow = groupRows.find((g) => g.parentGroupId === null && g.treeRole === rootTreeRole);
  if (!rootRow) {
    throw new Error(`No root RuleGroup found for treeRole "${rootTreeRole}" — a real data-integrity violation; every StrategyVersion must have exactly one ENTRY root and one EXIT root.`);
  }

  return buildNode(rootRow, rulesByGroupId, childGroupsByParentId);
}

/** Children (Rule | RuleGroup)[] are reconstructed in one merged, sortOrder-ordered sequence — the domain's own RuleGroup.children shape interleaves rules and nested groups in authored order, not "all rules, then all groups." */
function buildNode(groupRow: RuleGroupRow, rulesByGroupId: Map<string, RuleWithCondition[]>, childGroupsByParentId: Map<string, RuleGroupRow[]>): RuleGroup {
  type ChildEntry = { sortOrder: number; kind: "rule"; row: RuleWithCondition } | { sortOrder: number; kind: "group"; row: RuleGroupRow };

  const childEntries: ChildEntry[] = [
    ...(rulesByGroupId.get(groupRow.id) ?? []).map((row): ChildEntry => ({ sortOrder: row.sortOrder, kind: "rule", row })),
    ...(childGroupsByParentId.get(groupRow.id) ?? []).map((row): ChildEntry => ({ sortOrder: row.sortOrder, kind: "group", row })),
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  const children = childEntries.map((entry) => (entry.kind === "rule" ? toRuleDomain(entry.row) : buildNode(entry.row, rulesByGroupId, childGroupsByParentId)));

  return new RuleGroup(groupRow.id, toDomainLogicalOperator(groupRow.operator), children);
}

export interface FlattenedRuleGroupTree {
  groups: Array<{ id: string; organizationId: string; strategyVersionId: string; parentGroupId: string | null; treeRole: RuleTreeRole | null; operator: ReturnType<typeof toPrismaLogicalOperator>; sortOrder: number }>;
  rules: Array<{ rule: Rule; ruleGroupId: string; sortOrder: number }>;
}

/** The write-side counterpart — flattens a domain RuleGroup tree back into rows a repository can persist in flat batches, recording each node's real sortOrder so buildRuleGroupTree's own merge-by-sortOrder reconstruction round-trips authored order exactly. */
export function flattenRuleGroupTree(root: RuleGroup, strategyVersionId: string, organizationId: string, treeRole: RuleTreeRole, parentGroupId: string | null = null, sortOrderInParent = 0): FlattenedRuleGroupTree {
  const groups: FlattenedRuleGroupTree["groups"] = [
    { id: root.id, organizationId, strategyVersionId, parentGroupId, treeRole: parentGroupId === null ? treeRole : null, operator: toPrismaLogicalOperator(root.operator), sortOrder: sortOrderInParent },
  ];
  const rules: FlattenedRuleGroupTree["rules"] = [];

  root.children.forEach((child, index) => {
    if (child instanceof RuleGroup) {
      const nested = flattenRuleGroupTree(child, strategyVersionId, organizationId, treeRole, root.id, index);
      groups.push(...nested.groups);
      rules.push(...nested.rules);
    } else {
      rules.push({ rule: child, ruleGroupId: root.id, sortOrder: index });
    }
  });

  return { groups, rules };
}
