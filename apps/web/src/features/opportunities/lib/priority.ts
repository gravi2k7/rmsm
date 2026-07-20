import type { Opportunity } from "../types";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

const STRENGTH_WEIGHT: Record<Opportunity["signalStrength"], number> = { STRONG: 2, MODERATE: 1, WEAK: 0 };

/**
 * `Opportunity` has no `priority` field in the API — this combines the
 * two real fields that most naturally imply priority (`confidenceScore`
 * and `signalStrength`) into a simple three-tier ranking, purely for
 * sorting/scanning the feed. It is a client-side UI convenience, not a
 * value the backend computes or returns; it should not be confused with
 * `riskScore` (a genuinely different, Decision-level concept computed by
 * the real risk engine).
 */
export function derivePriority(opportunity: Pick<Opportunity, "confidenceScore" | "signalStrength">): Priority {
  const score = opportunity.confidenceScore + STRENGTH_WEIGHT[opportunity.signalStrength] * 25;
  if (score >= 90) return "HIGH";
  if (score >= 60) return "MEDIUM";
  return "LOW";
}
