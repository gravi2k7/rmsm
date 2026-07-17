import type { StrategyApproval } from "../entities/strategy-approval.entity";

export interface StrategyApprovalRepository {
  findById(id: string, organizationId: string): Promise<StrategyApproval | null>;
  findPendingByStrategyVersion(strategyVersionId: string, organizationId: string): Promise<StrategyApproval | null>;
  save(approval: StrategyApproval): Promise<void>;
}
