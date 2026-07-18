"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Copy, GripVertical, Trash2 } from "lucide-react";
import { Button, Input, Switch, cn } from "@rmsm/ui";
import { ConditionEditor } from "./condition-editor";
import type { RuleNode } from "@/types/strategy";
import type { ValidationFinding } from "@/types/strategy";

export function RuleRow({
  rule,
  onChange,
  onDelete,
  onDuplicate,
  findings,
}: {
  rule: RuleNode;
  onChange: (next: RuleNode) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  findings?: ValidationFinding[];
}) {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule._id });
  const ownFindings = findings?.filter((f) => f.nodeId === rule._id) ?? [];
  const hasErrors = ownFindings.some((f) => f.severity === "ERROR");

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-md border bg-background",
        isDragging && "opacity-60",
        hasErrors && "border-destructive",
      )}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
          aria-label={`Reorder rule "${rule.label || "untitled"}"`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="rounded p-1 text-muted-foreground hover:bg-accent"
        >
          {expanded ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />}
        </button>

        <Input
          value={rule.label}
          onChange={(e) => onChange({ ...rule, label: e.target.value })}
          placeholder="Rule label"
          aria-label="Rule label"
          className="h-8 flex-1"
        />

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={rule.enabled} onCheckedChange={(enabled) => onChange({ ...rule, enabled })} aria-label={`Enable rule "${rule.label || "untitled"}"`} />
          Enabled
        </label>

        <Button type="button" variant="ghost" size="icon" onClick={onDuplicate} aria-label={`Duplicate rule "${rule.label || "untitled"}"`}>
          <Copy className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete rule "${rule.label || "untitled"}"`}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t p-3">
          <ConditionEditor idPrefix={rule._id} condition={rule.condition} onChange={(condition) => onChange({ ...rule, condition })} />
          {ownFindings.length > 0 && (
            <ul className="mt-2 space-y-1" role="alert">
              {ownFindings.map((f, i) => (
                <li key={i} className={cn("text-xs", f.severity === "ERROR" ? "text-destructive" : "text-warning")}>
                  {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
