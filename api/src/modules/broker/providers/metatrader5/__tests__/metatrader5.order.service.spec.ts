import { MetaTrader5OrderService } from "../metatrader5.order.service";
import type { MetaTrader5Client } from "../metatrader5.client";
import type { BrokerOrderRequest } from "../../../interfaces/broker-models";

function buildClient(response: unknown): MetaTrader5Client {
  return { request: jest.fn().mockResolvedValue(response) } as unknown as MetaTrader5Client;
}

const ORDER_RESPONSE = { orderId: "ord-1", status: "FILLED", symbol: "EURUSD", type: "MARKET_BUY", volume: 1, price: 1.1, message: undefined };

describe("MetaTrader5OrderService", () => {
  it("placeOrder() maps BrokerOrderRequest to the gateway payload (sl/tp field names) and back to BrokerOrderResult", async () => {
    const client = buildClient(ORDER_RESPONSE);
    const service = new MetaTrader5OrderService(client);
    const request: BrokerOrderRequest = { symbol: "EURUSD", type: "MARKET_BUY", volume: 1, stopLoss: 1.05, takeProfit: 1.2 };

    const result = await service.placeOrder(request);

    expect(client.request).toHaveBeenCalledWith("POST", "/orders", { symbol: "EURUSD", type: "MARKET_BUY", volume: 1, price: undefined, sl: 1.05, tp: 1.2, comment: undefined });
    expect(result).toEqual({ orderId: "ord-1", status: "FILLED", symbol: "EURUSD", type: "MARKET_BUY", volume: 1, price: 1.1, message: undefined });
  });

  it("modifyOrder() sends price/sl/tp changes to PUT /orders/:id", async () => {
    const client = buildClient(ORDER_RESPONSE);
    const service = new MetaTrader5OrderService(client);

    await service.modifyOrder("ord-1", { price: 1.12, stopLoss: 1.06, takeProfit: 1.22 });

    expect(client.request).toHaveBeenCalledWith("PUT", "/orders/ord-1", { price: 1.12, sl: 1.06, tp: 1.22 });
  });

  it("cancelOrder() issues DELETE /orders/:id", async () => {
    const client = buildClient({ ...ORDER_RESPONSE, status: "CANCELLED" });
    const service = new MetaTrader5OrderService(client);

    const result = await service.cancelOrder("ord-1");

    expect(client.request).toHaveBeenCalledWith("DELETE", "/orders/ord-1");
    expect(result.status).toBe("CANCELLED");
  });

  it("URL-encodes the orderId path segment", async () => {
    const client = buildClient(ORDER_RESPONSE);
    const service = new MetaTrader5OrderService(client);

    await service.cancelOrder("ord/1 2");

    expect(client.request).toHaveBeenCalledWith("DELETE", "/orders/ord%2F1%202");
  });
});
