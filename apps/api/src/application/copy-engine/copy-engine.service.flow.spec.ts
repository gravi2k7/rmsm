jest.mock("@rmsm/database", () => {
  const actual = jest.requireActual("@rmsm/database");

  return {
    ...actual,
    prisma: {
      tradingOrder: {
        findUnique: jest.fn(),
      },
      copyGroup: {
        findMany: jest.fn(),
      },
      copyExecution: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
      tradingPosition: {
        findFirst: jest.fn(),
      },
      tradingTrade: {
        findMany: jest.fn(),
      },
    },
  };
});

import {
  CopyExecutionStatus,
  CopyGroupStatus,
  CopyMemberRole,
  TradingOrderStatus,
} from "@rmsm/database";
import { prisma } from "@rmsm/database";
import { DomainEventPublisher } from "../../common/events/domain-event-publisher.service";
import { BrokerExecutionService } from "../trading/broker-execution.service";
import { CopyEngineService } from "./copy-engine.service";

const mockedPrisma = prisma as unknown as {
  tradingOrder: {
    findUnique: jest.Mock;
  };
  copyGroup: {
    findMany: jest.Mock;
  };
  copyExecution: {
    upsert: jest.Mock;
    update: jest.Mock;
  };
  tradingPosition: {
    findFirst: jest.Mock;
  };
  tradingTrade: {
    findMany: jest.Mock;
  };
};

describe("CopyEngineService flow", () => {
  let service: CopyEngineService;
  let brokerExecutionService: {
    placeOrder: jest.Mock;
  };
  let domainEventPublisher: {
    on: jest.Mock;
  };

  const sourceOrderId = "source-order-1";
  const followerAccountId = "follower-account-1";
  const instrumentId = "instrument-1";
  const copyGroupId = "copy-group-1";
  const memberId = "member-1";
  const copyExecutionId = "copy-execution-1";

  const sourceOrder = {
    id: sourceOrderId,
    accountId: "master-account-1",
    instrumentId,
    side: "BUY",
    type: "MARKET",
    quantity: "2",
    status: TradingOrderStatus.FILLED,
  };

  const followerMember = {
    id: memberId,
    role: CopyMemberRole.FOLLOWER,
    enabled: true,
    quantityMultiplier: "2",
    fixedQuantity: null,
    maxQuantity: null,
    tradingAccount: {
      id: followerAccountId,
      status: "ACTIVE",
    },
    rule: {
      enabled: true,
      copyEntries: true,
      copyExits: true,
      copyLimitOrders: true,
      copyStopOrders: true,
      maxPositionQuantity: null,
      dailyLossLimit: null,
    },
  };

  const activeGroup = {
    id: copyGroupId,
    members: [followerMember],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    domainEventPublisher = {
      on: jest.fn(),
    };

    brokerExecutionService = {
      placeOrder: jest.fn(),
    };

    mockedPrisma.tradingOrder.findUnique.mockResolvedValue(sourceOrder);
    mockedPrisma.copyGroup.findMany.mockResolvedValue([activeGroup]);
    mockedPrisma.tradingPosition.findFirst.mockResolvedValue(null);
    mockedPrisma.tradingTrade.findMany.mockResolvedValue([]);

    mockedPrisma.copyExecution.upsert.mockResolvedValue({
      id: copyExecutionId,
      status: CopyExecutionStatus.PENDING,
      followerOrderId: null,
    });

    mockedPrisma.copyExecution.update.mockResolvedValue({});

    service = new CopyEngineService(
      domainEventPublisher as unknown as DomainEventPublisher,
      brokerExecutionService as unknown as BrokerExecutionService,
    );
  });

  it("copies a qualifying filled source order to the follower", async () => {
    brokerExecutionService.placeOrder.mockResolvedValue({
      accepted: true,
      status: "FILLED",
      message: "Follower order filled.",
      order: {
        id: "follower-order-1",
        status: TradingOrderStatus.FILLED,
      },
    });

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(mockedPrisma.copyExecution.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          copyGroupMemberId_sourceOrderId: {
            copyGroupMemberId: memberId,
            sourceOrderId,
          },
        },
        create: expect.objectContaining({
          copyGroupMemberId: memberId,
          sourceOrderId,
          requestedQuantity: "4",
          status: CopyExecutionStatus.PENDING,
        }),
      }),
    );

    expect(brokerExecutionService.placeOrder).toHaveBeenCalledWith(
      "org-1",
      followerAccountId,
      expect.objectContaining({
        instrumentId,
        side: "BUY",
        type: "MARKET",
        quantity: "4",
      }),
      {
        suppressCopyEvent: true,
      },
    );

    expect(mockedPrisma.copyExecution.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: copyExecutionId },
        data: expect.objectContaining({
          followerOrderId: "follower-order-1",
          status: CopyExecutionStatus.ACCEPTED,
          executedQuantity: "4",
        }),
      }),
    );
  });

  it("does not copy when the member rule rejects the order", async () => {
    const groupWithDisabledEntry = {
      ...activeGroup,
      members: [
        {
          ...followerMember,
          rule: {
            ...followerMember.rule,
            copyEntries: false,
          },
        },
      ],
    };

    mockedPrisma.copyGroup.findMany.mockResolvedValue([
      groupWithDisabledEntry,
    ]);

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(brokerExecutionService.placeOrder).not.toHaveBeenCalled();
    expect(mockedPrisma.copyExecution.upsert).not.toHaveBeenCalled();
  });

  it("does not submit a follower order when position risk blocks the copy", async () => {
    mockedPrisma.tradingPosition.findFirst.mockResolvedValue({
      quantity: "10",
    });

    mockedPrisma.copyGroup.findMany.mockResolvedValue([
      {
        ...activeGroup,
        members: [
          {
            ...followerMember,
            rule: {
              ...followerMember.rule,
              maxPositionQuantity: "10",
            },
          },
        ],
      },
    ]);

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(brokerExecutionService.placeOrder).not.toHaveBeenCalled();
    expect(mockedPrisma.copyExecution.upsert).not.toHaveBeenCalled();
  });

  it("allows an exit even when the follower is already at the maximum position", async () => {
    mockedPrisma.tradingPosition.findFirst.mockResolvedValue({
      quantity: "10",
    });

    mockedPrisma.copyGroup.findMany.mockResolvedValue([
      {
        ...activeGroup,
        members: [
          {
            ...followerMember,
            rule: {
              ...followerMember.rule,
              maxPositionQuantity: "10",
            },
          },
        ],
      },
    ]);

    mockedPrisma.tradingOrder.findUnique.mockResolvedValue({
      ...sourceOrder,
      side: "SELL",
    });

    brokerExecutionService.placeOrder.mockResolvedValue({
      accepted: true,
      status: "FILLED",
      order: {
        id: "follower-exit-1",
        status: TradingOrderStatus.FILLED,
      },
    });

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "SELL",
      type: "MARKET",
      executionKind: "EXIT",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(brokerExecutionService.placeOrder).toHaveBeenCalledWith(
      "org-1",
      followerAccountId,
      expect.objectContaining({
        instrumentId,
        side: "SELL",
        type: "MARKET",
        quantity: "4",
      }),
      {
        suppressCopyEvent: true,
      },
    );
  });

  it("marks the copy execution rejected when the follower broker rejects", async () => {
    brokerExecutionService.placeOrder.mockResolvedValue({
      accepted: false,
      status: "REJECTED",
      message: "Broker rejected follower order.",
      order: {
        id: "follower-rejected-1",
        status: "REJECTED",
      },
    });

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(mockedPrisma.copyExecution.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: copyExecutionId },
        data: expect.objectContaining({
          followerOrderId: "follower-rejected-1",
          status: CopyExecutionStatus.REJECTED,
          errorMessage: "Broker rejected follower order.",
        }),
      }),
    );
  });

  it("marks the copy execution failed when follower submission throws", async () => {
    brokerExecutionService.placeOrder.mockRejectedValue(
      new Error("Follower broker unavailable."),
    );

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(mockedPrisma.copyExecution.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: copyExecutionId },
        data: {
          status: CopyExecutionStatus.FAILED,
          errorMessage: "Follower broker unavailable.",
        },
      }),
    );
  });


  it("blocks a copy when the daily realized loss limit is reached", async () => {
    mockedPrisma.tradingTrade.findMany.mockResolvedValue([
      { realizedPnl: "-100" },
      { realizedPnl: "-25" },
    ]);

    mockedPrisma.copyGroup.findMany.mockResolvedValue([
      {
        ...activeGroup,
        members: [
          {
            ...followerMember,
            rule: {
              ...followerMember.rule,
              dailyLossLimit: "100",
            },
          },
        ],
      },
    ]);

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(brokerExecutionService.placeOrder).not.toHaveBeenCalled();
    expect(mockedPrisma.copyExecution.upsert).not.toHaveBeenCalled();
  });

  it("allows a copy when realized daily loss is below the configured limit", async () => {
    mockedPrisma.tradingTrade.findMany.mockResolvedValue([
      { realizedPnl: "-25" },
    ]);

    mockedPrisma.copyGroup.findMany.mockResolvedValue([
      {
        ...activeGroup,
        members: [
          {
            ...followerMember,
            rule: {
              ...followerMember.rule,
              dailyLossLimit: "100",
            },
          },
        ],
      },
    ]);

    brokerExecutionService.placeOrder.mockResolvedValue({
      accepted: true,
      status: "FILLED",
      order: {
        id: "daily-loss-ok-follower",
        status: TradingOrderStatus.FILLED,
      },
    });

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(brokerExecutionService.placeOrder).toHaveBeenCalledTimes(1);
  });

  it("rejects a reversal when the full reversal quantity exceeds the maximum position", async () => {
    mockedPrisma.tradingOrder.findUnique.mockResolvedValue({
      ...sourceOrder,
      side: "SELL",
      quantity: "12",
    });

    mockedPrisma.copyGroup.findMany.mockResolvedValue([
      {
        ...activeGroup,
        members: [
          {
            ...followerMember,
            rule: {
              ...followerMember.rule,
              maxPositionQuantity: "10",
            },
          },
        ],
      },
    ]);

    mockedPrisma.tradingPosition.findFirst.mockResolvedValue({
      quantity: "8",
    });

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "SELL",
      type: "MARKET",
      executionKind: "REVERSAL",
      quantity: "12",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(brokerExecutionService.placeOrder).not.toHaveBeenCalled();
    expect(mockedPrisma.copyExecution.upsert).not.toHaveBeenCalled();
  });

  it("does not submit a duplicate broker order for an existing completed copy execution", async () => {
    mockedPrisma.copyExecution.upsert.mockResolvedValue({
      id: copyExecutionId,
      status: CopyExecutionStatus.ACCEPTED,
      followerOrderId: "already-copied-order",
    });

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(brokerExecutionService.placeOrder).not.toHaveBeenCalled();
    expect(mockedPrisma.copyExecution.update).not.toHaveBeenCalled();
  });

  it("skips a follower whose trading account is inactive", async () => {
    mockedPrisma.copyGroup.findMany.mockResolvedValue([
      {
        ...activeGroup,
        members: [
          {
            ...followerMember,
            tradingAccount: {
              id: followerAccountId,
              status: "DISABLED",
            },
          },
        ],
      },
    ]);

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(brokerExecutionService.placeOrder).not.toHaveBeenCalled();
    expect(mockedPrisma.copyExecution.upsert).not.toHaveBeenCalled();
  });

  it("ignores a source order that is not filled", async () => {
    mockedPrisma.tradingOrder.findUnique.mockResolvedValue({
      ...sourceOrder,
      status: TradingOrderStatus.PENDING,
    });

    await service.prepareCopies({
      organizationId: "org-1",
      sourceOrderId,
      accountId: "master-account-1",
      instrumentId,
      side: "BUY",
      type: "MARKET",
      executionKind: "ENTRY",
      quantity: "2",
      executedPrice: "100",
      filledAt: new Date(),
    });

    expect(mockedPrisma.copyGroup.findMany).not.toHaveBeenCalled();
    expect(brokerExecutionService.placeOrder).not.toHaveBeenCalled();
  });
});
