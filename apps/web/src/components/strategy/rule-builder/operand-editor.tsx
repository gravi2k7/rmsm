"use client";

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rmsm/ui";
import { MARKET_FIELDS, type MarketField, type Operand, type OperandKind } from "@/types/strategy";

const OPERAND_KINDS: { value: OperandKind; label: string }[] = [
  { value: "indicator", label: "Indicator" },
  { value: "market_field", label: "Market field" },
  { value: "constant", label: "Constant" },
];

export function OperandEditor({
  operand,
  onChange,
  label,
  idPrefix,
}: {
  operand: Operand;
  onChange: (next: Operand) => void;
  label: string;
  idPrefix: string;
}) {
  return (
    <fieldset className="grid gap-2 rounded-md border p-3">
      <legend className="px-1 text-xs font-medium text-muted-foreground">{label}</legend>

      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-kind`}>Type</Label>
        <Select value={operand.kind} onValueChange={(kind: OperandKind) => onChange(resetOperandForKind(kind))}>
          <SelectTrigger id={`${idPrefix}-kind`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERAND_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {operand.kind === "indicator" && (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-indicator`}>Indicator identifier</Label>
            <Input
              id={`${idPrefix}-indicator`}
              value={operand.indicatorIdentifier ?? ""}
              onChange={(e) => onChange({ ...operand, indicatorIdentifier: e.target.value })}
              placeholder="e.g. ema"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-output`}>Output series</Label>
            <Input
              id={`${idPrefix}-output`}
              value={operand.outputSeries ?? ""}
              onChange={(e) => onChange({ ...operand, outputSeries: e.target.value })}
              placeholder="e.g. value"
            />
          </div>
        </>
      )}

      {operand.kind === "market_field" && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-field`}>Field</Label>
          <Select value={operand.field ?? "close"} onValueChange={(field: MarketField) => onChange({ ...operand, field })}>
            <SelectTrigger id={`${idPrefix}-field`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKET_FIELDS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {operand.kind === "constant" && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-value`}>Value</Label>
          <Input id={`${idPrefix}-value`} value={operand.value ?? ""} onChange={(e) => onChange({ ...operand, value: e.target.value })} placeholder="e.g. 30" />
        </div>
      )}
    </fieldset>
  );
}

function resetOperandForKind(kind: OperandKind): Operand {
  if (kind === "indicator") return { kind, indicatorIdentifier: "", outputSeries: "" };
  if (kind === "market_field") return { kind, field: "close" };
  return { kind, value: "" };
}
