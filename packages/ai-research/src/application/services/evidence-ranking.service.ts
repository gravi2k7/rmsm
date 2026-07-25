import type { Evidence } from "../../domain/entities/evidence.entity";
import { NoEvidenceFoundError } from "../../domain/errors/research-domain.errors";

/** Deterministic, non-ML ranking: sorts collected `Evidence` by
 * `relevanceScore` descending. A real semantic-similarity ranker is a
 * future concern (likely delegating to AI-305's embedding platform) —
 * this package ships the honest, provider-independent baseline. */
export class EvidenceRankingService {
  rank(evidence: readonly Evidence[]): readonly Evidence[] {
    return [...evidence].sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /** Same as `rank`, but throws `NoEvidenceFoundError` for an empty
   * input — for callers (like `ResearchReportBuilder`) that require at
   * least one piece of evidence to proceed. */
  requireRanked(evidence: readonly Evidence[], stepId: string): readonly Evidence[] {
    if (evidence.length === 0) {
      throw new NoEvidenceFoundError(stepId);
    }
    return this.rank(evidence);
  }

  topN(evidence: readonly Evidence[], n: number): readonly Evidence[] {
    return this.rank(evidence).slice(0, n);
  }
}
