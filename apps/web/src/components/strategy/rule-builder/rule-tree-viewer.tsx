import { Badge } from "@rmsm/ui";
import type { RuleTreeNode } from "@/types/strategy";

export function RuleTreeViewer({ node, findings }: { node: RuleTreeNode; findings?: { nodeId?: string; message: string; severity: string }[] }) {
  if (node.kind === "rule") {
    const ownFindings = findings?.filter((f) => f.nodeId === node._id) ?? [];
    return (
      <li className={`rounded-md border p-2 text-sm ${ownFindings.some((f) => f.severity === "ERROR") ? "border-destructive" : ""}`}>
        <div className="flex items-center justify-between">
          <span className="font-medium">{node.label || "Untitled rule"}</span>
          {!node.enabled && <Badge variant="secondary">disabled</Badge>}
        </div>
        <p className="text-muted-foreground">
          {describeOperandValue(node.condition.leftOperand)} {node.condition.operator.replace(/_/g, " ").toLowerCase()}{" "}
          {describeOperandValue(node.condition.rightOperand)}
          {node.condition.rightOperandUpper ? ` and ${describeOperandValue(node.condition.rightOperandUpper)}` : ""}
        </p>
        {ownFindings.map((f, i) => (
          <p key={i} className={f.severity === "ERROR" ? "text-destructive" : "text-warning"}>
            {f.message}
          </p>
        ))}
      </li>
    );
  }

  return (
    <li className="rounded-md border bg-muted/30 p-2">
      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{node.operator}</p>
      <ul className="space-y-2 pl-3">
        {node.children.map((child) => (
          <RuleTreeViewer key={child._id} node={child} findings={findings} />
        ))}
      </ul>
    </li>
  );
}

function describeOperandValue(operand: { kind: string; indicatorIdentifier?: string; outputSeries?: string; field?: string; value?: string }): string {
  if (operand.kind === "indicator") return `${operand.indicatorIdentifier ?? "?"}.${operand.outputSeries ?? "?"}`;
  if (operand.kind === "market_field") return operand.field ?? "?";
  return operand.value ?? "?";
}
