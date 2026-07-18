import { describe, expect, it } from "vitest";
import { addChild, cloneWithNewIds, findParentId, removeNode, replaceNode, reorderChildren } from "../rule-tree-ops";
import { createEmptyGroup, createEmptyRule } from "../rule-tree-mapper";
import type { RuleGroupNode } from "@/types/strategy";

function buildTree(): RuleGroupNode {
  const ruleA = createEmptyRule("A");
  const ruleB = createEmptyRule("B");
  const nestedGroup = createEmptyGroup("OR");
  nestedGroup.children = [createEmptyRule("nested-C")];
  return { ...createEmptyGroup("AND"), children: [ruleA, ruleB, nestedGroup] };
}

describe("replaceNode", () => {
  it("replaces a top-level child by id", () => {
    const tree = buildTree();
    const targetId = tree.children[0]!._id;
    const replacement = createEmptyRule("Replaced");

    const next = replaceNode(tree, targetId, replacement);

    expect(next.children[0]).toBe(replacement);
    expect(next.children[1]).toBe(tree.children[1]); // untouched sibling, same reference
  });

  it("replaces a deeply nested child", () => {
    const tree = buildTree();
    const nestedGroup = tree.children[2] as RuleGroupNode;
    const nestedRuleId = nestedGroup.children[0]!._id;
    const replacement = createEmptyRule("Replaced nested");

    const next = replaceNode(tree, nestedRuleId, replacement);
    const nextNested = next.children[2] as RuleGroupNode;

    expect(nextNested.children[0]).toBe(replacement);
  });
});

describe("removeNode", () => {
  it("removes a top-level child and leaves others intact", () => {
    const tree = buildTree();
    const idToRemove = tree.children[1]!._id;

    const next = removeNode(tree, idToRemove);

    expect(next.children).toHaveLength(2);
    expect(next.children.some((c) => c._id === idToRemove)).toBe(false);
  });

  it("removes a nested child without touching sibling groups", () => {
    const tree = buildTree();
    const nestedGroup = tree.children[2] as RuleGroupNode;
    const nestedId = nestedGroup.children[0]!._id;

    const next = removeNode(tree, nestedId);
    const nextNested = next.children[2] as RuleGroupNode;

    expect(nextNested.children).toHaveLength(0);
    expect(next.children).toHaveLength(3); // the now-empty group itself is not removed
  });
});

describe("addChild", () => {
  it("appends to the root when the root's own id is the parent", () => {
    const tree = buildTree();
    const newRule = createEmptyRule("New");

    const next = addChild(tree, tree._id, newRule);

    expect(next.children).toHaveLength(4);
    expect(next.children[3]).toBe(newRule);
  });

  it("appends to a nested group", () => {
    const tree = buildTree();
    const nestedGroup = tree.children[2] as RuleGroupNode;
    const newRule = createEmptyRule("New nested");

    const next = addChild(tree, nestedGroup._id, newRule);
    const nextNested = next.children[2] as RuleGroupNode;

    expect(nextNested.children).toHaveLength(2);
    expect(nextNested.children[1]).toBe(newRule);
  });
});

describe("reorderChildren", () => {
  it("moves a child from one index to another within the same group", () => {
    const tree = buildTree();
    const [a, b, c] = [tree.children[0]!, tree.children[1]!, tree.children[2]!];

    const next = reorderChildren(tree, tree._id, 0, 2);

    expect(next.children.map((n) => n._id)).toEqual([b._id, c._id, a._id]);
  });
});

describe("findParentId", () => {
  it("returns the root id for a top-level child", () => {
    const tree = buildTree();
    expect(findParentId(tree, tree.children[0]!._id)).toBe(tree._id);
  });

  it("returns the nested group's id for its own child", () => {
    const tree = buildTree();
    const nestedGroup = tree.children[2] as RuleGroupNode;
    expect(findParentId(tree, nestedGroup.children[0]!._id)).toBe(nestedGroup._id);
  });

  it("returns null for an id not present in the tree", () => {
    const tree = buildTree();
    expect(findParentId(tree, "does-not-exist")).toBeNull();
  });
});

describe("cloneWithNewIds", () => {
  it("produces a deep clone with entirely fresh ids at every level", () => {
    const tree = buildTree();
    let counter = 0;
    const genId = () => `clone-${counter++}`;

    const clone = cloneWithNewIds(tree, genId) as RuleGroupNode;

    expect(clone._id).not.toBe(tree._id);
    expect(clone.children[0]!._id).not.toBe(tree.children[0]!._id);
    const originalNestedIds = collectIds(tree);
    const cloneIds = collectIds(clone);
    expect(cloneIds.some((id) => originalNestedIds.includes(id))).toBe(false);
  });
});

function collectIds(node: RuleGroupNode): string[] {
  const ids = [node._id];
  for (const child of node.children) {
    ids.push(child._id);
    if (child.kind === "group") ids.push(...collectIds(child).slice(1));
  }
  return ids;
}
