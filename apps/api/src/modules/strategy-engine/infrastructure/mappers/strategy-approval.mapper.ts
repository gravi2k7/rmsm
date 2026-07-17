import type { StrategyApproval as StrategyApprovalRow } from "@rmsm/database";
import { StrategyApproval } from "../../domain/entities/strategy-approval.entity";
import { toPrismaApprovalDecision, toDomainApprovalDecision } from "./enum-mappers.util";

/** Milestone 2 fix applied — `decision` now goes through the exhaustive enum-mappers.util.ts translation instead of a blind `as ApprovalDecision` cast. decidedByUserId/decidedAt/comments remain plain nullable SCALAR columns (not Json) — a bare `null` is correct and unchanged for these, unlike a nullable Json? column (see json-value.util.ts's own header comment for why those two cases are genuinely different). */
export function toStrategyApprovalDomain(row: StrategyApprovalRow): StrategyApproval {
  return new StrategyApproval(row.id, row.strategyVersionId, row.requestedByUserId, row.requestedAt, toDomainApprovalDecision(row.decision), row.decidedByUserId ?? undefined, row.decidedAt ?? undefined, row.comments ?? undefined);
}

export function toStrategyApprovalPersistence(approval: StrategyApproval, organizationId: string) {
  return {
    id: approval.id,
    organizationId,
    strategyVersionId: approval.strategyVersionId,
    requestedByUserId: approval.requestedByUserId,
    requestedAt: approval.requestedAt,
    decision: toPrismaApprovalDecision(approval.decision),
    decidedByUserId: approval.decidedByUserId ?? null,
    decidedAt: approval.decidedAt ?? null,
    comments: approval.comments ?? null,
  };
}
