import type { RuleGroupNode, RuleTreeNode } from "@/types/strategy";

export function mapChildren(group: RuleGroupNode, fn: (child: RuleTreeNode) => RuleTreeNode): RuleGroupNode {
  return { ...group, children: group.children.map(fn) };
}

/** Replaces the node with the given `_id` anywhere in the tree, leaving everything else untouched. */
export function replaceNode(tree: RuleGroupNode, id: string, replacement: RuleTreeNode): RuleGroupNode {
  return mapChildren(tree, (child) => {
    if (child._id === id) return replacement;
    if (child.kind === "group") return replaceNode(child, id, replacement);
    return child;
  });
}

/** Removes the node with the given `_id` anywhere in the tree. */
export function removeNode(tree: RuleGroupNode, id: string): RuleGroupNode {
  const filtered = tree.children.filter((c) => c._id !== id);
  return { ...tree, children: filtered.map((c) => (c.kind === "group" ? removeNode(c, id) : c)) };
}

/** Appends a new child to the group with the given `_id` (or the root itself if `parentId` matches root). */
export function addChild(tree: RuleGroupNode, parentId: string, child: RuleTreeNode): RuleGroupNode {
  if (tree._id === parentId) return { ...tree, children: [...tree.children, child] };
  return mapChildren(tree, (c) => (c.kind === "group" ? addChild(c, parentId, child) : c));
}

/** Reorders the children of the group with the given `_id` (drag-and-drop). */
export function reorderChildren(tree: RuleGroupNode, groupId: string, fromIndex: number, toIndex: number): RuleGroupNode {
  if (tree._id === groupId) {
    const next = [...tree.children];
    const [moved] = next.splice(fromIndex, 1);
    if (moved) next.splice(toIndex, 0, moved);
    return { ...tree, children: next };
  }
  return mapChildren(tree, (c) => (c.kind === "group" ? reorderChildren(c, groupId, fromIndex, toIndex) : c));
}

/** Finds the immediate parent group id of a node, or null if it's the root or not found. */
export function findParentId(tree: RuleGroupNode, id: string): string | null {
  for (const child of tree.children) {
    if (child._id === id) return tree._id;
    if (child.kind === "group") {
      const found = findParentId(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function cloneWithNewIds(node: RuleTreeNode, genId: () => string): RuleTreeNode {
  if (node.kind === "rule") {
    return { ...node, _id: genId(), condition: structuredCloneCondition(node.condition) };
  }
  return { ...node, _id: genId(), children: node.children.map((c) => cloneWithNewIds(c, genId)) };
}

function structuredCloneCondition<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : (JSON.parse(JSON.stringify(value)) as T);
}
