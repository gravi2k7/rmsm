/** The result of checking a signal's own direction against a REAL,
 * unmodified `@rmsm/ai-market-intelligence` (AI-601)
 * `MultiTimeframeAnalysis` — never recomputes per-timeframe trend
 * alignment itself. */
export interface MultiTimeframeConfirmation {
  readonly opportunityId: string;
  readonly confirmed: boolean;
  readonly reason: string;
}
