import { CopyExecutionStatus, TradingOrder } from "@rmsm/database";

export interface CopyExecutionRecoveryRecord {
  id: string;
  copyGroupMemberId: string;
  followerOrderId: string | null;
  requestedQuantity: unknown;
  sentAt: Date | null;
  member: {
    tradingAccount: {
      id: string;
      organizationId: string;
      brokerConnectionId: string | null;
      brokerAccountId: string | null;
      status: string;
    } | null;
  };
}

export interface CopyExecutionRecoveryRepository {
  findStaleSentExecutions(
    staleBefore: Date,
  ): Promise<CopyExecutionRecoveryRecord[]>;

  findFollowerOrderById(
    orderId: string,
    accountId: string,
  ): Promise<TradingOrder | null>;

  findFollowerOrderByClientOrderId(
    accountId: string,
    clientOrderId: string,
  ): Promise<TradingOrder | null>;

  updateCopyExecution(
    copyExecutionId: string,
    data: {
      followerOrderId?: string;
      status: CopyExecutionStatus;
      executedQuantity?: string;
      completedAt?: Date;
      errorMessage?: string | null;
    },
  ): Promise<void>;
}
