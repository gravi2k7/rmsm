"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rmsm/ui";
import { OperandEditor } from "./operand-editor";
import { COMPARISON_OPERATORS, type Condition, type ComparisonOperator } from "@/types/strategy";
import { createEmptyOperand } from "@/lib/rule-tree-mapper";

const OPERATOR_LABELS: Record<ComparisonOperator, string> = {
  GREATER_THAN: ">",
  GREATER_THAN_OR_EQUAL: "≥",
  LESS_THAN: "<",
  LESS_THAN_OR_EQUAL: "≤",
  EQUAL: "=",
  NOT_EQUAL: "≠",
  CROSSES_ABOVE: "crosses above",
  CROSSES_BELOW: "crosses below",
  BETWEEN: "between",
};

export function ConditionEditor({ condition, onChange, idPrefix }: { condition: Condition; onChange: (next: Condition) => void; idPrefix: string }) {
  return (
    <div className="grid gap-3">
      <OperandEditor label="Left operand" idPrefix={`${idPrefix}-left`} operand={condition.leftOperand} onChange={(leftOperand) => onChange({ ...condition, leftOperand })} />

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Operator</span>
        <Select
          value={condition.operator}
          onValueChange={(operator: ComparisonOperator) =>
            onChange({
              ...condition,
              operator,
              rightOperandUpper: operator === "BETWEEN" ? (condition.rightOperandUpper ?? createEmptyOperand()) : undefined,
            })
          }
        >
          <SelectTrigger className="w-48" aria-label="Comparison operator">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPARISON_OPERATORS.map((op) => (
              <SelectItem key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OperandEditor
        label={condition.operator === "BETWEEN" ? "Right operand (lower bound)" : "Right operand"}
        idPrefix={`${idPrefix}-right`}
        operand={condition.rightOperand}
        onChange={(rightOperand) => onChange({ ...condition, rightOperand })}
      />

      {condition.operator === "BETWEEN" && (
        <OperandEditor
          label="Right operand (upper bound)"
          idPrefix={`${idPrefix}-right-upper`}
          operand={condition.rightOperandUpper ?? createEmptyOperand()}
          onChange={(rightOperandUpper) => onChange({ ...condition, rightOperandUpper })}
        />
      )}
    </div>
  );
}
