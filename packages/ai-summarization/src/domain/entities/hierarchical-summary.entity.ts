import type { SummaryNode } from "./summary-node.entity";

/** The full output of `HierarchicalSummarizer.summarize()` — every
 * level of the tree (not just the final rolled-up summary), so a
 * caller can inspect or display intermediate levels, not just the
 * root. */
export interface HierarchicalSummary {
  readonly levels: readonly (readonly SummaryNode[])[];
  readonly rootSummary: string;
}
