/**
 * The act of a specific `StrategyVersion` going live — item
 * "Publishing Workflow," made concrete. Distinct from `StrategyApproval`
 * (the human decision that a version IS publishable) — publication is
 * the actual event of it becoming the strategy's own active version,
 * which could in principle happen at a scheduled future time after
 * approval (`publishedAt` is real data, not just "now," leaving room
 * for a future "schedule this publish for market open Monday" feature
 * without a structural change here). `supersedesVersionId` records
 * exactly which prior version this publication replaced — the same
 * "preserve lineage, never silently overwrite" principle this entire
 * platform has followed since AI-101's own correction-as-new-row
 * design (ADR-022).
 */
export class StrategyPublication {
  constructor(
    public readonly id: string,
    public readonly strategyVersionId: string,
    public readonly publishedByUserId: string,
    public readonly publishedAt: Date,
    public readonly supersedesVersionId: string | null,
  ) {}
}
