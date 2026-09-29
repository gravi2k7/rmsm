import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { CopyGroupStatus, CopyMemberRole, TradingAccountStatus } from "@rmsm/database";
import { CopyGroupService } from "./copy-group.service";

describe("CopyGroupService", () => {
  const repository = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    addMember: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
    createRule: jest.fn(),
    updateRule: jest.fn(),
    listExecutions: jest.fn(),
  };

  const tradingAccountRepository = {
    findByAccountId: jest.fn(),
  };

  const transactionManager = {
    run: jest.fn(async (callback: any) => callback({})),
  };

  let service: CopyGroupService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CopyGroupService(
      repository as any,
      tradingAccountRepository as any,
      transactionManager as any,
    );
  });

  const organizationId = "20b9d83f-753c-4228-b032-bce483ff501c";
  const masterAccountId = "911075d9-afe3-40ea-a226-4c2aec1497e9";
  const followerAccountId = "141ea6fc-26ba-43ef-acce-7738f8e21eb6";
  const groupId = "11111111-1111-1111-1111-111111111111";

  const activeMaster = {
    id: masterAccountId,
    organizationId,
    status: TradingAccountStatus.ACTIVE,
    brokerConnectionId: "broker-1",
  };

  const activeFollower = {
    id: followerAccountId,
    organizationId,
    status: TradingAccountStatus.ACTIVE,
    brokerConnectionId: "broker-2",
  };

  const group = {
    id: groupId,
    organizationId,
    name: "NAS100 Copier",
    status: CopyGroupStatus.ACTIVE,
    masterAccountId,
    masterAccount: activeMaster,
    members: [
      {
        id: "master-member",
        tradingAccountId: masterAccountId,
        role: CopyMemberRole.MASTER,
        tradingAccount: activeMaster,
        rule: null,
      },
    ],
  };

  it("creates a group and automatically adds the master member", async () => {
    tradingAccountRepository.findByAccountId.mockResolvedValue(activeMaster);
    repository.create.mockResolvedValue({
      id: groupId,
    });
    repository.addMember.mockResolvedValue({
      id: "master-member",
    });
    repository.findById.mockResolvedValue(group);

    const result = await service.create(organizationId, {
      name: " NAS100 Copier ",
      masterAccountId,
    });

    expect(repository.create).toHaveBeenCalledWith(
      {
        organizationId,
        name: "NAS100 Copier",
        masterAccountId,
      },
      expect.anything(),
    );

    expect(repository.addMember).toHaveBeenCalledWith(
      expect.objectContaining({
        copyGroupId: groupId,
        tradingAccountId: masterAccountId,
        role: CopyMemberRole.MASTER,
        quantityMultiplier: "1",
        enabled: true,
      }),
      expect.anything(),
    );

    expect(result).toEqual(group);
  });

  it("rejects a master account that is not active", async () => {
    tradingAccountRepository.findByAccountId.mockResolvedValue({
      ...activeMaster,
      status: "DISABLED",
    });

    await expect(
      service.create(organizationId, {
        name: "Disabled",
        masterAccountId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.create).not.toHaveBeenCalled();
  });

  it("rejects a follower without broker connection", async () => {
    repository.findById.mockResolvedValue(group);
    tradingAccountRepository.findByAccountId.mockResolvedValue({
      ...activeFollower,
      brokerConnectionId: null,
    });

    await expect(
      service.addMember(organizationId, groupId, {
        tradingAccountId: followerAccountId,
        role: CopyMemberRole.FOLLOWER,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.addMember).not.toHaveBeenCalled();
  });

  it("rejects duplicate group members", async () => {
    repository.findById.mockResolvedValue({
      ...group,
      members: [
        ...group.members,
        {
          id: "follower-member",
          tradingAccountId: followerAccountId,
          role: CopyMemberRole.FOLLOWER,
          tradingAccount: activeFollower,
          rule: null,
        },
      ],
    });

    tradingAccountRepository.findByAccountId.mockResolvedValue(
      activeFollower,
    );

    await expect(
      service.addMember(organizationId, groupId, {
        tradingAccountId: followerAccountId,
        role: CopyMemberRole.FOLLOWER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.addMember).not.toHaveBeenCalled();
  });

  it("creates a default rule for a new follower", async () => {
    repository.findById.mockResolvedValue(group);
    tradingAccountRepository.findByAccountId.mockResolvedValue(
      activeFollower,
    );
    repository.addMember.mockResolvedValue({
      id: "follower-member",
      tradingAccountId: followerAccountId,
      role: CopyMemberRole.FOLLOWER,
    });

    await service.addMember(organizationId, groupId, {
      tradingAccountId: followerAccountId,
      role: CopyMemberRole.FOLLOWER,
    });

    expect(repository.createRule).toHaveBeenCalledWith(
      expect.objectContaining({
        copyGroupMemberId: "follower-member",
        copyEntries: true,
        copyExits: true,
        copyStopLoss: true,
        copyTakeProfit: true,
        copyLimitOrders: true,
        copyStopOrders: true,
        enabled: true,
      }),
      expect.anything(),
    );
  });

  it("does not allow removing the master member", async () => {
    repository.findById.mockResolvedValue(group);

    await expect(
      service.removeMember(
        organizationId,
        groupId,
        "master-member",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.removeMember).not.toHaveBeenCalled();
  });

  it("only allows rules on follower members", async () => {
    repository.findById.mockResolvedValue(group);

    await expect(
      service.upsertRule(
        organizationId,
        groupId,
        "master-member",
        { enabled: false },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.updateRule).not.toHaveBeenCalled();
  });

  it("rejects unknown groups", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.get(organizationId, groupId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
