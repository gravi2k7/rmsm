import { MetaTrader5HistoryService } from "../metatrader5.history.service";
import type { MetaTrader5Client } from "../metatrader5.client";
import type { BrokerDateRange } from "../../../interfaces/broker-models";

function buildClient(response: unknown): MetaTrader5Client {
  return { request: jest.fn().mockResolvedValue(response) } as unknown as MetaTrader5Client;
}

const RANGE: BrokerDateRange = { from: new Date("2026-01-01T00:00:00.000Z"), to: new Date("2026-01-31T00:00:00.000Z") };

describe("MetaTrader5HistoryService", () => {
  it("getOrderHistory() applies from/to date filtering as query params and maps every field", async () => {
    const client = buildClient([{ orderId: "ord-1", symbol: "EURUSD", type: "MARKET_BUY", volume: 1, price: 1.1, status: "FILLED", timeSetup: "2026-01-05T00:00:00.000Z" }]);
    const service = new MetaTrader5HistoryService(client);

    const records = await service.getOrderHistory(RANGE);

    expect(records).toEqual([{ orderId: "ord-1", symbol: "EURUSD", type: "MARKET_BUY", volume: 1, price: 1.1, status: "FILLED", placedAt: new Date("2026-01-05T00:00:00.000Z") }]);
    const [, path] = (client.request as jest.Mock).mock.calls[0] as [string, string];
    expect(path).toContain("from=2026-01-01T00%3A00%3A00.000Z");
    expect(path).toContain("to=2026-01-31T00%3A00%3A00.000Z");
  });

  it("getDealHistory() applies date filtering and maps profit/commission/swap", async () => {
    const client = buildClient([{ dealId: "deal-1", orderId: "ord-1", symbol: "EURUSD", volume: 1, price: 1.1, profit: 25, commission: -3, swap: -1, time: "2026-01-05T00:00:00.000Z" }]);
    const service = new MetaTrader5HistoryService(client);

    const deals = await service.getDealHistory(RANGE);

    expect(deals).toEqual([{ dealId: "deal-1", orderId: "ord-1", symbol: "EURUSD", volume: 1, price: 1.1, profit: 25, commission: -3, swap: -1, executedAt: new Date("2026-01-05T00:00:00.000Z") }]);
  });
});
