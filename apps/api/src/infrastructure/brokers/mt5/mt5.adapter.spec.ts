import { MetaTrader5Adapter } from "./mt5.adapter";
import { MetaTrader5Client } from "./mt5.client";

describe("MetaTrader5Adapter", () => {
  const client = {
    testConnection: jest.fn(),
    request: jest.fn(),
  } as unknown as MetaTrader5Client;

  const credentials = {
    login: "123456",
    password: "secret",
    server: "Demo-Server",
  };

  let adapter: MetaTrader5Adapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new MetaTrader5Adapter(client, credentials);
  });

  it("tests the MT5 connection", async () => {
    client.testConnection = jest.fn().mockResolvedValue({
      sessionId: "session-1",
      accountNumber: "123456",
      server: "Demo-Server",
      connectedAt: "2026-09-23T00:00:00.000Z",
    });

    await expect(adapter.testConnection()).resolves.toEqual({
      success: true,
      message: "Connected to MetaTrader 5 account 123456",
      brokerAccountId: "123456",
    });

    expect(client.testConnection).toHaveBeenCalledWith(credentials);
  });

  it("maps the RMSM client order id to an MT5-safe comment", async () => {
    client.request = jest.fn().mockResolvedValue({
      accepted: true,
      orderId: "mt5-order-1",
      dealId: "mt5-deal-1",
      positionId: "mt5-position-1",
      symbol: "NAS100.a",
      side: "BUY",
      volume: 1,
      price: 30400.5,
      status: "FILLED",
      message: "Done",
    });

    const result = await adapter.placeOrder({
      accountId: "61601273",
      instrumentId: "NAS100",
      brokerSymbol: "NAS100.a",
      side: "BUY",
      type: "MARKET",
      quantity: 1,
      clientOrderId:
        "RMSM-12345678-1234-1234-1234-123456789012-87654321-4321-4321-4321-210987654321",
    });

    expect(result).toMatchObject({
      brokerOrderId: "mt5-order-1",
      accepted: true,
      status: "FILLED",
      message: "Done",
      filledQuantity: 1,
      filledPrice: 30400.5,
    });

    expect(result.filledAt).toBeInstanceOf(Date);

    expect(result.fills).toHaveLength(1);
    expect(result.fills?.[0]).toMatchObject({
      id: "mt5-deal-1",
      accountId: "61601273",
      instrumentId: "NAS100",
      orderId: "mt5-order-1",
      side: "BUY",
      quantity: 1,
      price: 30400.5,
      commission: 0,
    });
    expect(result.fills?.[0]?.timestamp).toBeInstanceOf(Date);

    expect(client.request).toHaveBeenCalledWith(
      "POST",
      "/orders",
      {
        symbol: "NAS100.a",
        side: "BUY",
        orderType: "MARKET",
        volume: 1,
        comment: "RMSM",
      },
    );
  });

  it("maps the MT5 account to BrokerAccount", async () => {
    client.request = jest.fn().mockResolvedValue({
      login: 123456,
      name: "RMSM Demo",
      balance: 10000,
      equity: 9950,
      margin: 100,
      marginFree: 9850,
      marginLevel: 9950,
      currency: "USD",
      leverage: 100,
    });

    await expect(adapter.getAccounts()).resolves.toEqual([
      {
        id: "123456",
        name: "RMSM Demo",
        balance: 10000,
        canTrade: true,
        currency: "USD",
      },
    ]);

    expect(client.request).toHaveBeenCalledWith("GET", "/account");
  });

  it("maps MT5 positions", async () => {
    client.request = jest.fn().mockResolvedValue([
      {
        ticket: 1001,
        symbol: "EURUSD",
        side: "BUY",
        volume: 1.5,
        openPrice: 1.1,
        currentPrice: 1.105,
        profit: 75,
        swap: 0,
        commission: -2,
        timeOpen: "2026-09-23T00:00:00.000Z",
      },
      {
        ticket: 1002,
        symbol: "XAUUSD",
        side: "SELL",
        volume: 2,
        openPrice: 2500,
        currentPrice: 2495,
        profit: 100,
        swap: 0,
        commission: -4,
        timeOpen: "2026-09-23T00:01:00.000Z",
      },
    ]);

    await expect(adapter.getPositions("123456")).resolves.toEqual([
      {
        id: "1001",
        accountId: "123456",
        instrumentId: "EURUSD",
        side: "BUY",
        quantity: 1.5,
        averagePrice: 1.1,
      },
      {
        id: "1002",
        accountId: "123456",
        instrumentId: "XAUUSD",
        side: "SELL",
        quantity: 2,
        averagePrice: 2500,
      },
    ]);
  });

  it("maps MT5 order history", async () => {
    client.request = jest.fn().mockResolvedValue([
      {
        orderId: "ord-buy",
        symbol: "EURUSD",
        type: "MARKET_BUY",
        volume: 1,
        price: 1.1,
        status: "FILLED",
        timeSetup: "2026-09-23T00:00:00.000Z",
      },
      {
        orderId: "ord-sell",
        symbol: "EURUSD",
        type: "SELL_LIMIT",
        volume: 2,
        price: 1.2,
        status: "CANCELLED",
        timeSetup: "2026-09-23T00:01:00.000Z",
      },
    ]);

    const result = await adapter.getOrders(
      "123456",
      "2026-09-23T00:00:00.000Z",
      "2026-09-23T01:00:00.000Z",
    );

    expect(result).toEqual([
      {
        id: "ord-buy",
        accountId: "123456",
        instrumentId: "EURUSD",
        side: "BUY",
        type: "MARKET",
        quantity: 1,
        status: "FILLED",
        limitPrice: 1.1,
        createdAt: new Date("2026-09-23T00:00:00.000Z"),
        updatedAt: new Date("2026-09-23T00:00:00.000Z"),
      },
      {
        id: "ord-sell",
        accountId: "123456",
        instrumentId: "EURUSD",
        side: "SELL",
        type: "LIMIT",
        quantity: 2,
        status: "CANCELLED",
        limitPrice: 1.2,
        createdAt: new Date("2026-09-23T00:01:00.000Z"),
        updatedAt: new Date("2026-09-23T00:01:00.000Z"),
      },
    ]);
  });

  it("derives trade side from the referenced MT5 order", async () => {
    client.request = jest
      .fn()
      .mockImplementation(async (_method: string, path: string) => {
        if (path.startsWith("/history/deals?")) {
          return [
            {
              dealId: "deal-buy",
              orderId: "ord-buy",
              symbol: "EURUSD",
              volume: 1,
              price: 1.105,
              profit: 50,
              commission: -1,
              swap: 0,
              time: "2026-09-23T00:02:00.000Z",
            },
            {
              dealId: "deal-sell",
              orderId: "ord-sell",
              symbol: "EURUSD",
              volume: 1,
              price: 1.11,
              profit: 50,
              commission: -1,
              swap: 0,
              time: "2026-09-23T00:03:00.000Z",
            },
          ];
        }

        if (path.startsWith("/history/orders?")) {
          return [
            {
              orderId: "ord-buy",
              symbol: "EURUSD",
              type: "MARKET_BUY",
              volume: 1,
              price: 1.105,
              status: "FILLED",
              timeSetup: "2026-09-23T00:02:00.000Z",
            },
            {
              orderId: "ord-sell",
              symbol: "EURUSD",
              type: "MARKET_SELL",
              volume: 1,
              price: 1.11,
              status: "FILLED",
              timeSetup: "2026-09-23T00:03:00.000Z",
            },
          ];
        }

        throw new Error(`Unexpected request: ${path}`);
      });

    const result = await adapter.getTrades(
      "123456",
      "2026-09-23T00:00:00.000Z",
      "2026-09-23T01:00:00.000Z",
    );

    expect(result).toEqual([
      {
        id: "deal-buy",
        accountId: "123456",
        instrumentId: "EURUSD",
        orderId: "ord-buy",
        side: "BUY",
        quantity: 1,
        price: 1.105,
        commission: -1,
        profitAndLoss: 50,
        timestamp: new Date("2026-09-23T00:02:00.000Z"),
      },
      {
        id: "deal-sell",
        accountId: "123456",
        instrumentId: "EURUSD",
        orderId: "ord-sell",
        side: "SELL",
        quantity: 1,
        price: 1.11,
        commission: -1,
        profitAndLoss: 50,
        timestamp: new Date("2026-09-23T00:03:00.000Z"),
      },
    ]);
  });

  it("fails closed when a deal has no orderId", async () => {
    client.request = jest
      .fn()
      .mockImplementation(async (_method: string, path: string) => {
        if (path.startsWith("/history/deals?")) {
          return [
            {
              dealId: "deal-1",
              symbol: "EURUSD",
              volume: 1,
              price: 1.1,
              profit: 0,
              commission: 0,
              swap: 0,
              time: "2026-09-23T00:00:00.000Z",
            },
          ];
        }

        if (path.startsWith("/history/orders?")) {
          return [];
        }

        throw new Error(`Unexpected request: ${path}`);
      });

    await expect(
      adapter.getTrades(
        "123456",
        "2026-09-23T00:00:00.000Z",
        "2026-09-23T01:00:00.000Z",
      ),
    ).rejects.toThrow(
      "MT5 deal deal-1 has no orderId; cannot determine BUY/SELL side.",
    );
  });

  it("fails closed when a deal references an unknown order", async () => {
    client.request = jest
      .fn()
      .mockImplementation(async (_method: string, path: string) => {
        if (path.startsWith("/history/deals?")) {
          return [
            {
              dealId: "deal-1",
              orderId: "missing-order",
              symbol: "EURUSD",
              volume: 1,
              price: 1.1,
              profit: 0,
              commission: 0,
              swap: 0,
              time: "2026-09-23T00:00:00.000Z",
            },
          ];
        }

        if (path.startsWith("/history/orders?")) {
          return [];
        }

        throw new Error(`Unexpected request: ${path}`);
      });

    await expect(
      adapter.getTrades(
        "123456",
        "2026-09-23T00:00:00.000Z",
        "2026-09-23T01:00:00.000Z",
      ),
    ).rejects.toThrow(
      "MT5 deal deal-1 references unknown order missing-order; cannot determine BUY/SELL side.",
    );
  });

  it.each([
    ["BUY", "MARKET", "MARKET_BUY"],
    ["SELL", "MARKET", "MARKET_SELL"],
    ["BUY", "LIMIT", "BUY_LIMIT"],
    ["SELL", "LIMIT", "SELL_LIMIT"],
    ["BUY", "STOP", "BUY_STOP"],
    ["SELL", "STOP", "SELL_STOP"],
    ["BUY", "STOP_LIMIT", "BUY_STOP_LIMIT"],
    ["SELL", "STOP_LIMIT", "SELL_STOP_LIMIT"],
  ] as const)(
    "maps %s %s orders to MT5 type %s",
    async (side, type, expectedType) => {
      client.request = jest.fn().mockResolvedValue({
        orderId: "broker-order-1",
        status: "FILLED",
        symbol: "EURUSD",
        type: expectedType,
        volume: 1,
        price: 1.1,
      });

      const result = await adapter.placeOrder({
        accountId: "123456",
        instrumentId: "EURUSD",
        side,
        type,
        quantity: 1,
        ...(type === "LIMIT"
          ? { limitPrice: 1.09 }
          : type === "STOP" || type === "STOP_LIMIT"
            ? { stopPrice: 1.11 }
            : {}),
      });

      expect(result).toEqual({
        brokerOrderId: "broker-order-1",
        accepted: true,
        status: "FILLED",
        message: undefined,
      });

      expect(client.request).toHaveBeenCalledWith(
        "POST",
        "/orders",
        expect.objectContaining({
          symbol: "EURUSD",
          type: expectedType,
          volume: 1,
        }),
      );
    },
  );

  it("forwards attached stop-loss and take-profit to MT5", async () => {
    client.request = jest.fn().mockResolvedValue({
      orderId: "broker-order-risk",
      status: "FILLED",
      symbol: "EURUSD",
      type: "MARKET_BUY",
      volume: 1,
      price: 1.1,
    });

    await adapter.placeOrder({
      accountId: "123456",
      instrumentId: "EURUSD",
      side: "BUY",
      type: "MARKET",
      quantity: 1,
      stopLossPrice: 1.09,
      takeProfitPrice: 1.12,
    });

    expect(client.request).toHaveBeenCalledWith(
      "POST",
      "/orders",
      expect.objectContaining({
        symbol: "EURUSD",
        type: "MARKET_BUY",
        volume: 1,
        sl: 1.09,
        tp: 1.12,
      }),
    );
  });

  it("cancels an MT5 order", async () => {
    client.request = jest.fn().mockResolvedValue(undefined);

    await expect(
      adapter.cancelOrder("123456", "broker/order-1"),
    ).resolves.toBeUndefined();

    expect(client.request).toHaveBeenCalledWith(
      "DELETE",
      "/orders/broker%2Forder-1",
    );
  });

  it("modifies an MT5 order", async () => {
    client.request = jest.fn().mockResolvedValue(undefined);

    await adapter.modifyOrder("123456", "broker-order-1", {
      limitPrice: 1.09,
    });

    expect(client.request).toHaveBeenCalledWith(
      "PUT",
      "/orders/broker-order-1",
      { price: 1.09 },
    );
  });
});
