/** One node in a `HierarchicalSummary`'s tree — the summary of either
 * a raw source chunk (`level: 0`) or of a set of lower-level nodes'
 * summaries (`level > 0`). */
export interface SummaryNode {
  readonly level: number;
  readonly text: string;
  readonly sourceChunkIndices: readonly number[];
}
