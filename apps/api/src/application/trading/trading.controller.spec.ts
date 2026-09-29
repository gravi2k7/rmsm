import { TradingController } from "./trading.controller";

describe("TradingController broker execution routing", () => {
  const tradingAccountService = {
    getAccount: jest.fn(),
  };

  const paperTradingService = {
    placeOrder: jest.fn(),
  };

  const brokerSyncService = {
    syncAccount: jest.fn(),
  };

  const brokerExecutionService = {
    placeOrder: jest.fn(),
  };

  let controller: TradingController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new TradingController(
      tradingAccountService as never,
      paperTradingService as never,
      brokerSyncService as never,
      brokerExecutionService as never,
    );
  });

  const user = { sub: "user-1" } as never;

  const dto = {
    instrumentId: "instrument-1",
    side: "BUY" as const,
    type: "MARKET" as const,
    quantity: "1",
  };

  it("routes an unbound account to PaperTradingService", async () => {
    tradingAccountService.getAccount.mockResolvedValue({
      id: "account-1",
      brokerConnectionId: null,
      brokerAccountId: null,
    });

    paperTradingService.placeOrder.mockResolvedValue({
      id: "paper-order-1",
    });

    await expect(
      controller.placeOrder(
        "org-1",
        "account-1",
        dto,
        user,
      ),
    ).resolves.toEqual({
      id: "paper-order-1",
    });

    expect(paperTradingService.placeOrder).toHaveBeenCalledWith(
      "org-1",
      "user-1",
      "account-1",
      dto,
    );

    expect(brokerExecutionService.placeOrder).not.toHaveBeenCalled();
  });

  it("routes a broker-bound account to BrokerExecutionService", async () => {
    tradingAccountService.getAccount.mockResolvedValue({
      id: "account-1",
      brokerConnectionId: "connection-1",
      brokerAccountId: "broker-account-1",
    });

    brokerExecutionService.placeOrder.mockResolvedValue({
      accepted: true,
      brokerOrderId: "broker-order-1",
    });

    await expect(
      controller.placeOrder(
        "org-1",
        "account-1",
        dto,
        user,
      ),
    ).resolves.toEqual({
      accepted: true,
      brokerOrderId: "broker-order-1",
    });

    expect(brokerExecutionService.placeOrder).toHaveBeenCalledWith(
      "org-1",
      "account-1",
      dto,
    );

    expect(paperTradingService.placeOrder).not.toHaveBeenCalled();
  });

  it("forwards broker-bound SL/TP to BrokerExecutionService", async () => {
    tradingAccountService.getAccount.mockResolvedValue({
      id: "account-1",
      brokerConnectionId: "connection-1",
      brokerAccountId: "broker-account-1",
    });

    brokerExecutionService.placeOrder.mockResolvedValue({
      accepted: true,
      brokerOrderId: "broker-order-sl-tp",
    });

    const brokerDto = {
      ...dto,
      stopLossPrice: "6000",
      takeProfitPrice: "6200",
    };

    await expect(
      controller.placeOrder(
        "org-1",
        "account-1",
        brokerDto,
        user,
      ),
    ).resolves.toEqual({
      accepted: true,
      brokerOrderId: "broker-order-sl-tp",
    });

    expect(brokerExecutionService.placeOrder).toHaveBeenCalledWith(
      "org-1",
      "account-1",
      brokerDto,
    );

    expect(paperTradingService.placeOrder).not.toHaveBeenCalled();
  });

  it("routes a broker-bound LIMIT order with its limit price", async () => {
    tradingAccountService.getAccount.mockResolvedValue({
      id: "account-1",
      brokerConnectionId: "connection-1",
      brokerAccountId: "broker-account-1",
    });

    brokerExecutionService.placeOrder.mockResolvedValue({
      accepted: true,
    });

    const limitDto = {
      ...dto,
      type: "LIMIT" as const,
      limitPrice: "6100",
    };

    await controller.placeOrder(
      "org-1",
      "account-1",
      limitDto,
      user,
    );

    expect(brokerExecutionService.placeOrder).toHaveBeenCalledWith(
      "org-1",
      "account-1",
      limitDto,
    );
  });
});
