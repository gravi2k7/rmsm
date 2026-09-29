import { CopyExecutionStatus, TradingOrderStatus } from "@rmsm/database";
import { CopyExecutionRecoveryService } from "./copy-execution-recovery.service";

describe("CopyExecutionRecoveryService", () => {
  const brokerConnectionService = {
    getAdapterForExecution: jest.fn(),
  };

  const brokerExecutionService = {
    reconcileBrokerOrder: jest.fn(),
  };

  const recoveryRepository = {
    findStaleSentExecutions: jest.fn(),
    findFollowerOrderById: jest.fn(),
    findFollowerOrderByClientOrderId: jest.fn(),
    updateCopyExecution: jest.fn(),
  };

  let service: CopyExecutionRecoveryService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new CopyExecutionRecoveryService(
      brokerConnectionService as never,
      brokerExecutionService as never,
      recoveryRepository as never,
    );
  });

  function execution(overrides: Record<string, unknown> = {}) {
    return {
      id: "copy-1",
      copyGroupMemberId: "member-1",
      followerOrderId: null,
      requestedQuantity: "1",
      sentAt: new Date(Date.now() - 60_000),
      member: {
        tradingAccount: {
          id: "account-1",
          organizationId: "org-1",
          brokerConnectionId: "connection-1",
          brokerAccountId: "broker-account-1",
          status: "ACTIVE",
        },
      },
      ...overrides,
    };
  }

  function brokerOrder(overrides: Record<string, unknown> = {}) {
    return {
      id: "broker-order-1",
      accountId: "broker-account-1",
      instrumentId: "US500.a",
      side: "BUY",
      type: "MARKET",
      quantity: 1,
      status: "FILLED",
      filledQuantity: 1,
      filledPrice: 7700,
      clientOrderId: "RMSM-COPY-copy-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  it("does nothing when the broker order is not found", async () => {
    const adapter = {
      getOrders: jest.fn().mockResolvedValue([]),
      getTrades: jest.fn(),
    };

    recoveryRepository.findStaleSentExecutions.mockResolvedValue([
      execution(),
    ]);

    brokerConnectionService.getAdapterForExecution.mockResolvedValue(
      adapter,
    );

    await service.recoverStaleSentExecutions();

    expect(adapter.getOrders).toHaveBeenCalled();
    expect(adapter.getTrades).not.toHaveBeenCalled();
    expect(
      brokerExecutionService.reconcileBrokerOrder,
    ).not.toHaveBeenCalled();
    expect(
      recoveryRepository.updateCopyExecution,
    ).not.toHaveBeenCalled();
  });

  it("reconciles an existing filled broker order without submitting another order", async () => {
    const adapter = {
      getOrders: jest.fn().mockResolvedValue([
        brokerOrder(),
      ]),
      getTrades: jest.fn().mockResolvedValue([
        {
          id: "deal-1",
          orderId: "broker-order-1",
          instrumentId: "US500.a",
          side: "BUY",
          quantity: 0.4,
          price: 7700,
          commission: 0,
          timestamp: new Date(),
        },
      ]),
      placeOrder: jest.fn(),
    };

    const localOrder = {
      id: "follower-order-1",
      accountId: "account-1",
      clientOrderId: "RMSM-COPY-copy-1",
      status: TradingOrderStatus.PENDING,
      quantity: "1",
    };

    recoveryRepository.findStaleSentExecutions.mockResolvedValue([
      execution(),
    ]);

    recoveryRepository.findFollowerOrderByClientOrderId.mockResolvedValue(
      localOrder,
    );

    brokerConnectionService.getAdapterForExecution.mockResolvedValue(
      adapter,
    );

    brokerExecutionService.reconcileBrokerOrder.mockResolvedValue({
      order: {
        ...localOrder,
        status: TradingOrderStatus.FILLED,
      },
      executedQuantity: 0.4,
    });

    await service.recoverStaleSentExecutions();

    expect(adapter.placeOrder).not.toHaveBeenCalled();

    expect(
      brokerExecutionService.reconcileBrokerOrder,
    ).toHaveBeenCalledWith(
      "org-1",
      "account-1",
      "follower-order-1",
      "broker-order-1",
      expect.any(Array),
      "FILLED",
      1,
      7700,
      expect.any(Date),
    );

    expect(recoveryRepository.updateCopyExecution).toHaveBeenCalledWith(
      "copy-1",
      {
        followerOrderId: "follower-order-1",
        status: CopyExecutionStatus.ACCEPTED,
        executedQuantity: "0.4",
        completedAt: expect.any(Date),
        errorMessage: null,
      },
    );
  });

  it("correlates recovery by the local follower brokerOrderId when the broker client order id differs", async () => {
    const adapter = {
      getOrders: jest.fn().mockResolvedValue([
        brokerOrder({
          id: "mt5-order-390688385",
          clientOrderId: "RMSM",
        }),
      ]),
      getTrades: jest.fn().mockResolvedValue([
        {
          id: "deal-390688385",
          orderId: "mt5-order-390688385",
          instrumentId: "US500.a",
          side: "BUY",
          quantity: 1,
          price: 7700,
          commission: 0,
          timestamp: new Date(),
        },
      ]),
      placeOrder: jest.fn(),
    };

    const localOrder = {
      id: "follower-order-1",
      accountId: "account-1",
      clientOrderId: "RMSM-COPY-copy-1",
      brokerOrderId: "mt5-order-390688385",
      status: TradingOrderStatus.PENDING,
      quantity: "1",
    };

    recoveryRepository.findStaleSentExecutions.mockResolvedValue([
      execution({
        followerOrderId: "follower-order-1",
      }),
    ]);

    recoveryRepository.findFollowerOrderById.mockResolvedValue(localOrder);

    brokerConnectionService.getAdapterForExecution.mockResolvedValue(
      adapter,
    );

    brokerExecutionService.reconcileBrokerOrder.mockResolvedValue({
      order: {
        ...localOrder,
        status: TradingOrderStatus.FILLED,
      },
      executedQuantity: 1,
    });

    await service.recoverStaleSentExecutions();

    expect(
      recoveryRepository.findFollowerOrderById,
    ).toHaveBeenCalledWith("follower-order-1", "account-1");

    expect(
      recoveryRepository.findFollowerOrderByClientOrderId,
    ).not.toHaveBeenCalled();

    expect(adapter.placeOrder).not.toHaveBeenCalled();

    expect(
      brokerExecutionService.reconcileBrokerOrder,
    ).toHaveBeenCalledWith(
      "org-1",
      "account-1",
      "follower-order-1",
      "mt5-order-390688385",
      expect.any(Array),
      "FILLED",
      1,
      7700,
      expect.any(Date),
    );
  });

  it("keeps the copy execution SENT when the broker order remains pending", async () => {
    const adapter = {
      getOrders: jest.fn().mockResolvedValue([
        brokerOrder({
          status: "PENDING",
          filledQuantity: 0,
          filledPrice: undefined,
        }),
      ]),
      getTrades: jest.fn().mockResolvedValue([]),
    };

    const localOrder = {
      id: "follower-order-1",
      accountId: "account-1",
      clientOrderId: "RMSM-COPY-copy-1",
      status: TradingOrderStatus.PENDING,
      quantity: "1",
    };

    recoveryRepository.findStaleSentExecutions.mockResolvedValue([
      execution(),
    ]);

    recoveryRepository.findFollowerOrderByClientOrderId.mockResolvedValue(
      localOrder,
    );

    brokerConnectionService.getAdapterForExecution.mockResolvedValue(
      adapter,
    );

    brokerExecutionService.reconcileBrokerOrder.mockResolvedValue({
      order: {
        ...localOrder,
        status: TradingOrderStatus.PENDING,
      },
      executedQuantity: 0,
    });

    await service.recoverStaleSentExecutions();

    expect(recoveryRepository.updateCopyExecution).toHaveBeenCalledWith(
      "copy-1",
      {
        followerOrderId: "follower-order-1",
        status: CopyExecutionStatus.SENT,
        errorMessage: null,
      },
    );
  });

  it("marks the copy execution rejected when the broker order is rejected", async () => {
    const adapter = {
      getOrders: jest.fn().mockResolvedValue([
        brokerOrder({
          status: "REJECTED",
          filledQuantity: 0,
        }),
      ]),
      getTrades: jest.fn().mockResolvedValue([]),
    };

    const localOrder = {
      id: "follower-order-1",
      accountId: "account-1",
      clientOrderId: "RMSM-COPY-copy-1",
      status: TradingOrderStatus.PENDING,
      quantity: "1",
    };

    recoveryRepository.findStaleSentExecutions.mockResolvedValue([
      execution(),
    ]);

    recoveryRepository.findFollowerOrderByClientOrderId.mockResolvedValue(
      localOrder,
    );

    brokerConnectionService.getAdapterForExecution.mockResolvedValue(
      adapter,
    );

    brokerExecutionService.reconcileBrokerOrder.mockResolvedValue({
      order: {
        ...localOrder,
        status: TradingOrderStatus.REJECTED,
        rejectionReason: "Broker rejected order.",
      },
      executedQuantity: 0,
    });

    await service.recoverStaleSentExecutions();

    expect(recoveryRepository.updateCopyExecution).toHaveBeenCalledWith(
      "copy-1",
      {
        followerOrderId: "follower-order-1",
        status: CopyExecutionStatus.REJECTED,
        completedAt: expect.any(Date),
        errorMessage: "Broker rejected order.",
      },
    );
  });

  it("does not create a local order when the broker order exists but the local follower order is missing", async () => {
    const adapter = {
      getOrders: jest.fn().mockResolvedValue([
        brokerOrder(),
      ]),
      getTrades: jest.fn().mockResolvedValue([]),
      placeOrder: jest.fn(),
    };

    recoveryRepository.findStaleSentExecutions.mockResolvedValue([
      execution(),
    ]);

    recoveryRepository.findFollowerOrderByClientOrderId.mockResolvedValue(
      null,
    );

    brokerConnectionService.getAdapterForExecution.mockResolvedValue(
      adapter,
    );

    await service.recoverStaleSentExecutions();

    expect(adapter.placeOrder).not.toHaveBeenCalled();
    expect(
      brokerExecutionService.reconcileBrokerOrder,
    ).not.toHaveBeenCalled();
    expect(
      recoveryRepository.updateCopyExecution,
    ).not.toHaveBeenCalled();
  });
});
