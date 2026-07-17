import { buildRuleGroupTree, flattenRuleGroupTree } from "../mappers/rule-group.mapper";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import { Rule } from "../../domain/entities/rule.entity";
import { Condition } from "../../domain/entities/condition.entity";
import { ComparisonOperatorType } from "@rmsm/database";
import type { RuleGroup as RuleGroupRow, RuleWithCondition, Prisma } from "@rmsm/database";

function buildCondition(id: string): Condition {
  return new Condition(id, { kind: "constant", value: "1" }, "GREATER_THAN", { kind: "constant", value: "0" });
}

/**
 * Test-only fixture helper — deliberately NOT the production
 * `toJsonInput` (`json-value.util.ts`). That function returns
 * `Prisma.InputJsonValue`, the WRITE-side type; a mocked query RESULT
 * row (what `buildRuleRow` below constructs) needs `Prisma.JsonValue`,
 * the READ-side type — the same real distinction Prisma's own
 * generated types enforce that the `strategy-parameter.mapper.spec.ts`
 * fix already corrected for. `InputJsonValue` and `JsonValue` are
 * similar but genuinely different types (an `InputJsonObject`, for
 * instance, isn't structurally an array the way `JsonValue`'s own
 * array variant requires) — real generated Prisma types catch this
 * distinction even when a hand-written offline stub doesn't. This
 * helper does the identical serialization (`JSON.parse(JSON.stringify(...))`)
 * production code performs, typed correctly for its own read-side use
 * here instead.
 */
function toJsonValueFixture<T>(value: T): Prisma.JsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
}

/**
 * A mocked Prisma query RESULT row — `leftOperand`/`rightOperand` are
 * `Prisma.JsonValue` (whatever a real read returns), constructed here
 * via `toJsonValueFixture` (this file's own read-side-typed helper,
 * above) rather than a raw `Operand` object literal standing in for
 * it, or the production write-side helper. `operator` is the real
 * Prisma-generated enum member (`ComparisonOperatorType.GREATER_THAN`),
 * not the domain's own `ComparisonOperator` string — a query result
 * row genuinely holds the Prisma enum value, never the domain one.
 */
function buildRuleRow(id: string, ruleGroupId: string, sortOrder: number): RuleWithCondition {
  return {
    id,
    organizationId: "org1",
    ruleGroupId,
    label: `Rule ${id}`,
    enabled: true,
    sortOrder,
    version: 1,
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    condition: {
      id: `cond-${id}`,
      organizationId: "org1",
      ruleId: id,
      leftOperand: toJsonValueFixture({ kind: "constant", value: "1" }),
      operator: ComparisonOperatorType.GREATER_THAN,
      rightOperand: toJsonValueFixture({ kind: "constant", value: "0" }),
      rightOperandUpper: null,
      version: 1,
      createdById: null,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
  };
}

function buildGroupRow(id: string, parentGroupId: string | null, treeRole: "ENTRY" | "EXIT" | null, operator: "AND" | "OR" | "NOT", sortOrder: number): RuleGroupRow {
  return { id, organizationId: "org1", strategyVersionId: "ver1", parentGroupId, treeRole, operator, sortOrder, version: 1, createdById: null, updatedById: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null };
}

describe("rule-group.mapper — tree reconstruction (buildRuleGroupTree)", () => {
  it("reconstructs a single-node root with no children", () => {
    const groups = [buildGroupRow("root", null, "ENTRY", "AND", 0)];
    const tree = buildRuleGroupTree(groups, [], "ENTRY");
    expect(tree.id).toBe("root");
    expect(tree.children).toEqual([]);
  });

  it("reconstructs a root with 2 direct rule children, in sortOrder", () => {
    const groups = [buildGroupRow("root", null, "ENTRY", "AND", 0)];
    const rules = [buildRuleRow("r2", "root", 1), buildRuleRow("r1", "root", 0)];
    const tree = buildRuleGroupTree(groups, rules, "ENTRY");
    expect(tree.children.map((c) => c.id)).toEqual(["r1", "r2"]);
  });

  it("reconstructs arbitrary depth — a genuinely deep tree, not limited by any hardcoded include depth", () => {
    // root -> group1 -> group2 -> group3 -> group4 -> rule (5 levels of nesting)
    const groups = [
      buildGroupRow("root", null, "ENTRY", "AND", 0),
      buildGroupRow("g1", "root", "ENTRY", "AND", 0),
      buildGroupRow("g2", "g1", null, "AND", 0),
      buildGroupRow("g3", "g2", null, "AND", 0),
      buildGroupRow("g4", "g3", null, "AND", 0),
    ];
    const rules = [buildRuleRow("deep-rule", "g4", 0)];
    const tree = buildRuleGroupTree(groups, rules, "ENTRY");

    let cursor: RuleGroup = tree;
    for (let i = 0; i < 5; i++) {
      expect(cursor.children).toHaveLength(1);
      cursor = cursor.children[0] as RuleGroup;
    }
    expect(cursor.id).toBe("deep-rule");
  });

  it("interleaves rules and nested groups in authored sortOrder, not rules-first-then-groups", () => {
    const groups = [buildGroupRow("root", null, "ENTRY", "AND", 0), buildGroupRow("nested", "root", null, "OR", 1)];
    const rules = [buildRuleRow("first-rule", "root", 0), buildRuleRow("last-rule", "root", 2)];
    const tree = buildRuleGroupTree(groups, rules, "ENTRY");
    expect(tree.children.map((c) => c.id)).toEqual(["first-rule", "nested", "last-rule"]);
  });

  it("distinguishes ENTRY and EXIT roots — reconstructing EXIT never picks up the ENTRY tree's own nodes", () => {
    const groups = [buildGroupRow("entry-root", null, "ENTRY", "AND", 0), buildGroupRow("exit-root", null, "EXIT", "OR", 0)];
    const entryTree = buildRuleGroupTree(groups, [], "ENTRY");
    const exitTree = buildRuleGroupTree(groups, [], "EXIT");
    expect(entryTree.id).toBe("entry-root");
    expect(entryTree.operator).toBe("AND");
    expect(exitTree.id).toBe("exit-root");
    expect(exitTree.operator).toBe("OR");
  });

  it("throws a clear error when no root exists for the requested treeRole — a real data-integrity problem, not silently returning an empty tree", () => {
    const groups = [buildGroupRow("entry-root", null, "ENTRY", "AND", 0)];
    expect(() => buildRuleGroupTree(groups, [], "EXIT")).toThrow(/No root RuleGroup found/);
  });
});

describe("rule-group.mapper — flattening (flattenRuleGroupTree), the write-side counterpart", () => {
  it("flattens a single-node tree to exactly one group row and zero rule rows", () => {
    const tree = new RuleGroup("root", "AND", []);
    const { groups, rules } = flattenRuleGroupTree(tree, "ver1", "org1", "ENTRY");
    expect(groups).toHaveLength(1);
    expect(rules).toHaveLength(0);
    expect(groups[0]!.treeRole).toBe("ENTRY");
    expect(groups[0]!.parentGroupId).toBeNull();
  });

  it("flattens nested groups with the correct parentGroupId chain and null treeRole on non-root nodes", () => {
    const nested = new RuleGroup("nested", "OR", []);
    const root = new RuleGroup("root", "AND", [nested]);
    const { groups } = flattenRuleGroupTree(root, "ver1", "org1", "ENTRY");
    expect(groups).toHaveLength(2);
    const nestedRow = groups.find((g) => g.id === "nested")!;
    expect(nestedRow.parentGroupId).toBe("root");
    expect(nestedRow.treeRole).toBeNull();
  });

  it("round-trips through build -> flatten -> build without losing structure", () => {
    const condition = buildCondition("c1");
    const rule = new Rule("r1", "Test rule", condition, true);
    const nested = new RuleGroup("nested", "OR", [rule]);
    const original = new RuleGroup("root", "AND", [nested]);

    const { groups, rules } = flattenRuleGroupTree(original, "ver1", "org1", "ENTRY");
    const ruleWithConditionRows: RuleWithCondition[] = rules.map(({ rule: r, ruleGroupId, sortOrder }) => ({
      id: r.id,
      organizationId: "org1",
      ruleGroupId,
      label: r.label,
      enabled: r.enabled,
      sortOrder,
      version: 1,
      createdById: null,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      condition: {
        id: `cond-${r.id}`,
        organizationId: "org1",
        ruleId: r.id,
        leftOperand: toJsonValueFixture(r.condition.leftOperand),
        operator: ComparisonOperatorType.GREATER_THAN,
        rightOperand: toJsonValueFixture(r.condition.rightOperand),
        rightOperandUpper: r.condition.rightOperandUpper ? toJsonValueFixture(r.condition.rightOperandUpper) : null,
        version: 1,
        createdById: null,
        updatedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    }));

    const rebuilt = buildRuleGroupTree(groups as RuleGroupRow[], ruleWithConditionRows, "ENTRY");
    expect(rebuilt.id).toBe("root");
    expect((rebuilt.children[0] as RuleGroup).id).toBe("nested");
    expect(((rebuilt.children[0] as RuleGroup).children[0] as Rule).id).toBe("r1");
  });
});
