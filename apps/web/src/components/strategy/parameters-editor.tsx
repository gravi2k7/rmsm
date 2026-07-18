"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rmsm/ui";
import type { StrategyParameterDefinition } from "@/types/strategy";

const PARAM_TYPES: StrategyParameterDefinition["type"][] = ["integer", "decimal", "boolean", "enum", "string"];

export function ParametersEditor({
  parameters,
  onChange,
}: {
  parameters: StrategyParameterDefinition[];
  onChange: (next: StrategyParameterDefinition[]) => void;
}) {
  function update(index: number, patch: Partial<StrategyParameterDefinition>) {
    onChange(parameters.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function remove(index: number) {
    onChange(parameters.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...parameters, { type: "integer", name: "", required: true }]);
  }

  return (
    <div className="space-y-3">
      {parameters.length === 0 && <p className="text-sm text-muted-foreground">No parameters defined yet.</p>}
      {parameters.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2 rounded-md border p-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`param-name-${i}`}>Name</Label>
            <Input id={`param-name-${i}`} value={p.name} onChange={(e) => update(i, { name: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`param-type-${i}`}>Type</Label>
            <Select value={p.type} onValueChange={(type: StrategyParameterDefinition["type"]) => update(i, { type })}>
              <SelectTrigger id={`param-type-${i}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARAM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Checkbox checked={p.required} onCheckedChange={(checked) => update(i, { required: checked === true })} aria-label={`Parameter "${p.name || "unnamed"}" required`} />
            Required
          </label>
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label={`Remove parameter "${p.name || "unnamed"}"`}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus /> Add Parameter
      </Button>
    </div>
  );
}
