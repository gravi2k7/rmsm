import type { Source } from "./source.entity";

/** One fact/quote/excerpt collected in support of a research step,
 * tied to the `Source` it came from and carrying a relevance score
 * `EvidenceRanker` sorts on. */
export interface Evidence {
  readonly id: string;
  readonly stepId: string;
  readonly source: Source;
  readonly excerpt: string;
  readonly relevanceScore: number;
}
