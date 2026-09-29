import type {
  CopyExecution,
  CopyGroup,
  CopyGroupMember,
  CopyRule,
  CopyMemberRole,
  CopyGroupStatus,
  DbClient,
  TradingAccount,
} from "@rmsm/database";

export interface CopyGroupWithDetails extends CopyGroup {
  masterAccount: TradingAccount;
  members: Array<
    CopyGroupMember & {
      tradingAccount: TradingAccount;
      rule: CopyRule | null;
    }
  >;
}

export interface CopyGroupRepository {
  create(
    data: {
      organizationId: string;
      name: string;
      masterAccountId: string;
    },
    client?: DbClient,
  ): Promise<CopyGroup>;

  findById(
    organizationId: string,
    id: string,
    client?: DbClient,
  ): Promise<CopyGroupWithDetails | null>;

  findMany(
    organizationId: string,
    client?: DbClient,
  ): Promise<CopyGroupWithDetails[]>;

  update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      status?: CopyGroupStatus;
    },
    client?: DbClient,
  ): Promise<CopyGroup>;

  addMember(
    data: {
      copyGroupId: string;
      tradingAccountId: string;
      role: CopyMemberRole;
      quantityMultiplier: string;
      fixedQuantity?: string | null;
      maxQuantity?: string | null;
      enabled: boolean;
    },
    client?: DbClient,
  ): Promise<CopyGroupMember>;

  updateMember(
    id: string,
    data: {
      quantityMultiplier?: string;
      fixedQuantity?: string | null;
      maxQuantity?: string | null;
      enabled?: boolean;
    },
    client?: DbClient,
  ): Promise<CopyGroupMember>;

  removeMember(
    id: string,
    client?: DbClient,
  ): Promise<void>;

  createRule(
    data: {
      copyGroupMemberId: string;
      copyEntries: boolean;
      copyExits: boolean;
      copyStopLoss: boolean;
      copyTakeProfit: boolean;
      copyLimitOrders: boolean;
      copyStopOrders: boolean;
      maxPositionQuantity?: string | null;
      dailyLossLimit?: string | null;
      enabled: boolean;
    },
    client?: DbClient,
  ): Promise<CopyRule>;

  updateRule(
    copyGroupMemberId: string,
    data: {
      copyEntries?: boolean;
      copyExits?: boolean;
      copyStopLoss?: boolean;
      copyTakeProfit?: boolean;
      copyLimitOrders?: boolean;
      copyStopOrders?: boolean;
      maxPositionQuantity?: string | null;
      dailyLossLimit?: string | null;
      enabled?: boolean;
    },
    client?: DbClient,
  ): Promise<CopyRule>;

  listExecutions(
    organizationId: string,
    copyGroupId: string,
    client?: DbClient,
  ): Promise<CopyExecution[]>;
}
