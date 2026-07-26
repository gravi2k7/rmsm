import { Check, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ComparisonCellValue = boolean | string | number | null | undefined;

export interface ComparisonColumn {
  key: string;
  label: string;
  /** Visually emphasizes one column (e.g. the plan being promoted). */
  highlight?: boolean;
}

export interface ComparisonRow {
  label: string;
  values: Record<string, ComparisonCellValue>;
}

interface ComparisonTableProps {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  caption?: string;
  className?: string;
}

function Cell({ value }: { value: ComparisonCellValue }): ReactNode {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-muted-foreground/50" aria-hidden="true" />;
  if (value === null || value === undefined || value === "") return <Minus className="mx-auto h-4 w-4 text-muted-foreground/30" aria-hidden="true" />;
  return <span className="text-sm">{value}</span>;
}

/**
 * Generic comparison table (Section 2's "FeatureComparison" and Section
 * 10's "Comparison Table" are the same UI pattern with different data — one
 * implementation here, re-exported by both `features/` and `pricing/`,
 * rather than two near-identical tables). No pricing/business logic: every
 * cell is caller-supplied data.
 */
export function ComparisonTable({ columns, rows, caption, className }: ComparisonTableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full border-collapse text-left">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th scope="col" className="p-4 text-sm font-medium text-muted-foreground">
              &nbsp;
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn("p-4 text-center text-sm font-semibold", column.highlight && "bg-accent/60 text-accent-foreground")}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-0">
              <th scope="row" className="p-4 text-sm font-medium">
                {row.label}
              </th>
              {columns.map((column) => (
                <td key={column.key} className={cn("p-4 text-center", column.highlight && "bg-accent/30")}>
                  <Cell value={row.values[column.key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
