import { describe, expect, it, jest } from "@jest/globals";
import { ProjectXAdapter } from "./projectx.adapter";
import type { ProjectXClient } from "./projectx.client";

describe("ProjectXAdapter", () => {
  function createClientMock() {
    return {
      testConnection: jest.fn(),
      getAccounts: jest.fn(),
      getOpenPositions: jest.fn(),
      getOpenOrders: jest.fn(),
      placeOrder: jest.fn(),
      cancelOrder: jest.fn(),
      modifyOrder: jest.fn(),
    } as unknown as jest.Mocked<ProjectXClient>;
  }

  it("maps ProjectX accounts into the generic broker account contract", async () => {
    const client = createClientMock();

    client.getAccounts.mockResolvedValue({
      success: true,
      accounts: [
        {
          id: 12345,
          name: "Demo Account",
          balance: 50000,
          canTrade: true,
        },
      ],
    } as never);

    const adapter = new ProjectXAdapter(client);

    await expect(adapter.getAccounts()).resolves.toEqual([
      {
        id: "12345",
        name: "Demo Account",
        balance: 50000,
        canTrade: true,
      },
    ]);
  });

  it("maps BUY STOP_LIMIT orders to ProjectX order type 3 and side 0", async () => {
    const client = createClientMock();

    client.placeOrder.mockResolvedValue({
      success: true,
      orderId: 98765,
    } as never);

    const adapter = new ProjectXAdapter(client);

    const result = await adapter.placeOrder({
      accountId: "12345",
      instrumentId: "CONTRACT-1",
      side: "BUY",
      type: "STOP_LIMIT",
      quantity: 2,
      limitPrice: 21000.5,
      stopPrice: 21001,
      clientOrderId: "RMSM-TEST-001",
    });

    expect(client.placeOrder).toHaveBeenCalledWith({
      accountId: 12345,
      contractId: "CONTRACT-1",
      type: 3,
      side: 0,
      size: 2,
      limitPrice: 21000.5,
      stopPrice: 21001,
      customTag: "RMSM-TEST-001",
    });

    expect(result).toEqual({
      brokerOrderId: "98765",
      accepted: true,
      status: "ACCEPTED",
      message: undefined,
    });
  });

  it("maps SELL MARKET orders to ProjectX type 2 and side 1", async () => {
    const client = createClientMock();

    client.placeOrder.mockResolvedValue({
      success: true,
      orderId: 98766,
    } as never);

    const adapter = new ProjectXAdapter(client);

    await adapter.placeOrder({
      accountId: "12345",
      instrumentId: "CONTRACT-2",
      side: "SELL",
      type: "MARKET",
      quantity: 1,
    });

    expect(client.placeOrder).toHaveBeenCalledWith({
      accountId: 12345,
      contractId: "CONTRACT-2",
      type: 2,
      side: 1,
      size: 1,
      limitPrice: null,
      stopPrice: null,
      customTag: null,
    });
  });

  it("rejects invalid ProjectX account IDs before making broker calls", async () => {
    const client = createClientMock();
    const adapter = new ProjectXAdapter(client);

    await expect(
      adapter.placeOrder({
        accountId: "not-a-number",
        instrumentId: "CONTRACT-1",
        side: "BUY",
        type: "MARKET",
        quantity: 1,
      }),
    ).rejects.toThrow("Invalid ProjectX account ID");

    expect(client.placeOrder).not.toHaveBeenCalled();
  });

  it("maps ProjectX positions into the generic broker position contract", async () => {
    const client = createClientMock();

    client.getOpenPositions.mockResolvedValue({
      success: true,
      positions: [
        {
          id: 77,
          accountId: 12345,
          contractId: "CONTRACT-1",
          type: 1,
          size: 2,
          averagePrice: 21000.25,
        },
      ],
    } as never);

    const adapter = new ProjectXAdapter(client);

    await expect(adapter.getPositions("12345")).resolves.toEqual([
      {
        id: "77",
        accountId: "12345",
        instrumentId: "CONTRACT-1",
        side: "BUY",
        quantity: 2,
        averagePrice: 21000.25,
      },
    ]);
  });
});
