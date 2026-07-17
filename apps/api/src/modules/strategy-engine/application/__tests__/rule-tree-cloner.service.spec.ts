import { RuleTreeClonerService } from "../services/rule-tree-cloner.service";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import { Rule } from "../../domain/entities/rule.entity";
import { Condition } from "../../domain/entities/condition.entity";

function buildCondition(id: string): Condition {
  return new Condition(id, { kind: "constant", value: "1" }, "GREATER_THAN", { kind: "constant", value: "0" });
}

describe("RuleTreeClonerService", () => {
  let cloner: RuleTreeClonerService;

  beforeEach(() => {
    cloner = new RuleTreeClonerService();
  });

  it("clones a single-node tree with a NEW id, not the original's own id", () => {
    const original = new RuleGroup("root", "AND", []);
    const clone = cloner.clone(original);
    expect(clone.id).not.toBe(original.id);
    expect(clone.operator).toBe(original.operator);
  });

  it("clones every Rule/Condition inside the tree with fresh ids, preserving real content", () => {
    const condition = buildCondition("c1");
    const rule = new Rule("r1", "Original rule", condition, true);
    const original = new RuleGroup("root", "AND", [rule]);

    const clone = cloner.clone(original);
    const clonedRule = clone.children[0] as Rule;

    expect(clonedRule.id).not.toBe(rule.id);
    expect(clonedRule.condition.id).not.toBe(condition.id);
    expect(clonedRule.label).toBe(rule.label);
    expect(clonedRule.enabled).toBe(rule.enabled);
    expect(clonedRule.condition.leftOperand).toEqual(condition.leftOperand);
    expect(clonedRule.condition.operator).toBe(condition.operator);
  });

  it("clones an arbitrarily deep nested tree correctly, with fresh ids at every level", () => {
    const deepRule = new Rule("deep-rule", "Deep", buildCondition("deep-cond"), true);
    const level3 = new RuleGroup("level3", "AND", [deepRule]);
    const level2 = new RuleGroup("level2", "OR", [level3]);
    const original = new RuleGroup("level1", "AND", [level2]);

    const clone = cloner.clone(original);
    const clonedLevel2 = clone.children[0] as RuleGroup;
    const clonedLevel3 = clonedLevel2.children[0] as RuleGroup;
    const clonedDeepRule = clonedLevel3.children[0] as Rule;

    expect(clone.id).not.toBe(original.id);
    expect(clonedLevel2.id).not.toBe(level2.id);
    expect(clonedLevel3.id).not.toBe(level3.id);
    expect(clonedDeepRule.id).not.toBe(deepRule.id);
    expect(clonedDeepRule.label).toBe("Deep");
  });

  it("preserves the exact number and order of children at every level", () => {
    const r1 = new Rule("r1", "First", buildCondition("c1"), true);
    const r2 = new Rule("r2", "Second", buildCondition("c2"), true);
    const original = new RuleGroup("root", "AND", [r1, r2]);

    const clone = cloner.clone(original);
    expect(clone.children).toHaveLength(2);
    expect((clone.children[0] as Rule).label).toBe("First");
    expect((clone.children[1] as Rule).label).toBe("Second");
  });

  it("does not mutate the original tree at all", () => {
    const rule = new Rule("r1", "Original", buildCondition("c1"), true);
    const original = new RuleGroup("root", "AND", [rule]);
    cloner.clone(original);
    expect(original.id).toBe("root");
    expect(original.children[0]!.id).toBe("r1");
  });
});
