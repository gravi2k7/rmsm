import { api } from "@/lib/api-client";

export type CopyGroupStatus = "ACTIVE" | "PAUSED" | "DISABLED";
export type CopyMemberRole = "MASTER" | "FOLLOWER";

export interface CopyRule {
  id: string;
  copyEntries: boolean;
  copyExits: boolean;
  copyStopLoss: boolean;
  copyTakeProfit: boolean;
  copyLimitOrders: boolean;
  copyStopOrders: boolean;
  maxPositionQuantity: string | null;
  dailyLossLimit: string | null;
  enabled: boolean;
}

export interface CopyGroupMember {
  id: string;
  copyGroupId: string;
  tradingAccountId: string;
  role: CopyMemberRole;
  quantityMultiplier: string;
  fixedQuantity: string | null;
  maxQuantity: string | null;
  enabled: boolean;
  tradingAccount: {
    id: string;
    name: string;
    status: string;
    brokerConnectionId: string | null;
    brokerAccountId: string | null;
  };
  rule: CopyRule | null;
}

export interface CopyGroup {
  id: string;
  organizationId: string;
  name: string;
  status: CopyGroupStatus;
  masterAccountId: string;
  masterAccount: {
    id: string;
    name: string;
    status: string;
    brokerConnectionId: string | null;
    brokerAccountId: string | null;
  };
  members: CopyGroupMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCopyGroupInput {
  name: string;
  masterAccountId: string;
}

export interface AddCopyGroupMemberInput {
  tradingAccountId: string;
  role: CopyMemberRole;
  quantityMultiplier?: string;
  fixedQuantity?: string;
  maxQuantity?: string;
  enabled?: boolean;
}

export async function getCopyGroups(
  organizationId: string,
): Promise<CopyGroup[]> {
  return api.get<CopyGroup[]>(
    `/organizations/${organizationId}/copy-groups`,
  );
}

export async function getCopyGroup(
  organizationId: string,
  groupId: string,
): Promise<CopyGroup> {
  return api.get<CopyGroup>(
    `/organizations/${organizationId}/copy-groups/${groupId}`,
  );
}

export async function createCopyGroup(
  organizationId: string,
  input: CreateCopyGroupInput,
): Promise<CopyGroup> {
  return api.post<CopyGroup>(
    `/organizations/${organizationId}/copy-groups`,
    input,
  );
}

export async function updateCopyGroup(
  organizationId: string,
  groupId: string,
  input: {
    name?: string;
    status?: CopyGroupStatus;
  },
): Promise<CopyGroup> {
  return api.patch<CopyGroup>(
    `/organizations/${organizationId}/copy-groups/${groupId}`,
    input,
  );
}

export async function addCopyGroupMember(
  organizationId: string,
  groupId: string,
  input: AddCopyGroupMemberInput,
): Promise<CopyGroupMember> {
  return api.post<CopyGroupMember>(
    `/organizations/${organizationId}/copy-groups/${groupId}/members`,
    input,
  );
}

export async function updateCopyGroupMember(
  organizationId: string,
  groupId: string,
  memberId: string,
  input: {
    quantityMultiplier?: string;
    fixedQuantity?: string | null;
    maxQuantity?: string | null;
    enabled?: boolean;
  },
): Promise<CopyGroupMember> {
  return api.patch<CopyGroupMember>(
    `/organizations/${organizationId}/copy-groups/${groupId}/members/${memberId}`,
    input,
  );
}

export async function updateCopyRule(
  organizationId: string,
  groupId: string,
  memberId: string,
  input: Partial<CopyRule>,
): Promise<CopyRule> {
  return api.patch<CopyRule>(
    `/organizations/${organizationId}/copy-groups/${groupId}/members/${memberId}/rule`,
    input,
  );
}
