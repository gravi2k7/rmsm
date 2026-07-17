/**
 * One approval WORKFLOW instance for one `StrategyVersion` — distinct
 * from `StrategyValidation` (an automated, rules-based check) and from
 * `StrategyPublication` (the act of actually going live): this is a
 * HUMAN decision, "Approval Workflow" named as its own responsibility
 * separately from "Validation Engine" and "Publishing Workflow"
 * because it genuinely is a separate concern — a version can pass
 * every automated validation and still be rejected by a human
 * reviewer (e.g. for a reason no automated rule could ever check, like
 * "this strategy's risk profile doesn't match our current market
 * outlook").
 */
export class StrategyApproval {
  constructor(
    public readonly id: string,
    public readonly strategyVersionId: string,
    public readonly requestedByUserId: string,
    public readonly requestedAt: Date,
    public readonly decision: "PENDING" | "APPROVED" | "REJECTED",
    public readonly decidedByUserId?: string,
    public readonly decidedAt?: Date,
    public readonly comments?: string,
  ) {}
}
