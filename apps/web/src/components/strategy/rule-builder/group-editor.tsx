"use client";

import { memo, useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Copy, FolderPlus, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from "@rmsm/ui";
import { RuleRow } from "./rule-row";
import { createEmptyGroup, createEmptyRule } from "@/lib/rule-tree-mapper";
import type { LogicalOperator, RuleGroupNode, RuleTreeNode, ValidationFinding } from "@/types/strategy";

function GroupEditorImpl({
  group,
  onChange,
  onDelete,
  onDuplicate,
  isRoot = false,
  findings,
}: {
  group: RuleGroupNode;
  onChange: (next: RuleGroupNode) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  isRoot?: boolean;
  findings?: ValidationFinding[];
}) {
  const [expanded, setExpanded] = useState(true);
  const sortable = useSortable({ id: group._id, disabled: isRoot });
  const style = isRoot ? undefined : { transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition };

  function updateChild(id: string, next: RuleTreeNode) {
    onChange({ ...group, children: group.children.map((c) => (c._id === id ? next : c)) });
  }

  function deleteChild(id: string) {
    onChange({ ...group, children: group.children.filter((c) => c._id !== id) });
  }

  function duplicateChild(id: string) {
    const target = group.children.find((c) => c._id === id);
    if (!target) return;
    const clone = cloneNode(target);
    const index = group.children.findIndex((c) => c._id === id);
    const next = [...group.children];
    next.splice(index + 1, 0, clone);
    onChange({ ...group, children: next });
  }

  return (
    <div
      ref={isRoot ? undefined : sortable.setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-muted/30",
        !isRoot && sortable.isDragging && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2 p-2">
        {!isRoot && (
          <button
            type="button"
            className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
            aria-label="Reorder group"
            {...sortable.attributes}
            {...sortable.listeners}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </button>
        )}

        <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="rounded p-1 text-muted-foreground hover:bg-accent">
          {expanded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
        </button>

        <span className="text-xs font-medium text-muted-foreground">{isRoot ? "Root group" : "Group"}</span>

        <Select value={group.operator} onValueChange={(operator: LogicalOperator) => onChange({ ...group, operator })}>
          <SelectTrigger className="h-8 w-24" aria-label="Group logical operator">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND</SelectItem>
            <SelectItem value="OR">OR</SelectItem>
            <SelectItem value="NOT">NOT</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...group, children: [...group.children, createEmptyRule()] })}>
            <Plus className="size-4" /> Rule
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...group, children: [...group.children, createEmptyGroup()] })}>
            <FolderPlus className="size-4" /> Group
          </Button>
          {!isRoot && onDuplicate && (
            <Button type="button" variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplicate group">
              <Copy className="size-4" />
            </Button>
          )}
          {!isRoot && onDelete && (
            <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label="Delete group">
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t p-2 pl-6">
          {group.children.length === 0 && <p className="py-2 text-xs text-muted-foreground">No conditions yet — add a rule or nested group.</p>}
          <SortableContext items={group.children.map((c) => c._id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {group.children.map((child) =>
                child.kind === "rule" ? (
                  <RuleRow
                    key={child._id}
                    rule={child}
                    findings={findings}
                    onChange={(next) => updateChild(child._id, next)}
                    onDelete={() => deleteChild(child._id)}
                    onDuplicate={() => duplicateChild(child._id)}
                  />
                ) : (
                  <li key={child._id}>
                    <GroupEditor
                      group={child}
                      findings={findings}
                      onChange={(next) => updateChild(child._id, next)}
                      onDelete={() => deleteChild(child._id)}
                      onDuplicate={() => duplicateChild(child._id)}
                    />
                  </li>
                ),
              )}
            </ul>
          </SortableContext>
        </div>
      )}
    </div>
  );
}

/** Memoized — see `rule-row.tsx`'s own comment on `RuleRow` for the honest
 * caveat: this helps for re-renders unrelated to this subtree, but sibling
 * groups still re-render together today since their `onChange` props are
 * recreated on every parent render. */
export const GroupEditor = memo(GroupEditorImpl);

function cloneNode(node: RuleTreeNode): RuleTreeNode {
  const genId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `node-${Math.random().toString(36).slice(2)}`);
  if (node.kind === "rule") {
    return { ...node, _id: genId(), condition: JSON.parse(JSON.stringify(node.condition)) };
  }
  return { ...node, _id: genId(), children: node.children.map(cloneNode) };
}
