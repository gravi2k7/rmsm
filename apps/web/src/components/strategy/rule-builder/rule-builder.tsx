"use client";

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { GroupEditor } from "./group-editor";
import { findParentId, reorderChildren } from "@/lib/rule-tree-ops";
import type { RuleGroupNode, ValidationFinding } from "@/types/strategy";

/**
 * Drag-and-drop reordering is scoped to siblings within the same group —
 * dragging a rule/group into a *different* group isn't supported yet (a
 * real, named gap for this milestone; see Milestone 5's own architectural-
 * decisions doc). Within one group's own children, reordering is fully
 * functional via dnd-kit's sortable list.
 */
export function RuleBuilder({
  title,
  tree,
  onChange,
  findings,
}: {
  title: string;
  tree: RuleGroupNode;
  onChange: (next: RuleGroupNode) => void;
  findings?: ValidationFinding[];
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeParent = findParentId(tree, activeId);
    const overParent = findParentId(tree, overId);
    if (!activeParent || activeParent !== overParent) return;

    const parentGroup = locateGroup(tree, activeParent);
    if (!parentGroup) return;
    const fromIndex = parentGroup.children.findIndex((c) => c._id === activeId);
    const toIndex = parentGroup.children.findIndex((c) => c._id === overId);
    if (fromIndex === -1 || toIndex === -1) return;

    onChange(reorderChildren(tree, activeParent, fromIndex, toIndex));
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <GroupEditor group={tree} onChange={onChange} isRoot findings={findings} />
      </DndContext>
    </div>
  );
}

function locateGroup(tree: RuleGroupNode, id: string): RuleGroupNode | null {
  if (tree._id === id) return tree;
  for (const child of tree.children) {
    if (child.kind === "group") {
      const found = locateGroup(child, id);
      if (found) return found;
    }
  }
  return null;
}
