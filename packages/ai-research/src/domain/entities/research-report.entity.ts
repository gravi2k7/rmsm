import type { Citation } from "./citation.entity";

/** The final output of `ResearchReportBuilder` — a synthesized answer
 * plus every citation that backs it, in ranked order. */
export interface ResearchReport {
  readonly planId: string;
  readonly summary: string;
  readonly citations: readonly Citation[];
}
