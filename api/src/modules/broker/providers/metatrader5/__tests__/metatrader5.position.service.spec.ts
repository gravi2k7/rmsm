import { MetaTrader5PositionService } from "../metatrader5.position.service";
import type { MetaTrader5Client } from "../metatrader5.client";

const RAW_POSITION = {
  ticket: "pos-1",
  symbol: "EURUSD",
  type: "BUY" as const,
  volume: 1,
  priceOpen: 1.1,
  priceCurrent: 1.105,
  profit: 50,
  swap: -2,
  commission: -5,
  timeOpen: "2026-01-01T00:00:00.000Z",
};

function buildClient(response: unknown): MetaTrader5Client {
  return { request: jest.fn().mockResolvedValue(response) } as unknown as MetaTrader5Client;
}

describe("MetaTrader5PositionService", () => {
  it("listOpenPositions() maps every raw position, including floating profit/swap/commission", async () => {
    const client = buildClient([RAW_POSITION]);
    const service = new MetaTrader5PositionService(client);

    const positions = await service.listOpenPositions();

    expect(positions).toEqual([
      { positionId: "pos-1", symbol: "EURUSD", side: "BUY", volume: 1, openPrice: 1.1, currentPrice: 1.105, floatingProfit: 50, swap: -2, commission: -5, openedAt: new Date("2026-01-01T00:00:00.000Z") },
    ]);
    expect(client.request).toHaveBeenCalledWith("GET", "/positions");
  });

  it("getPosition() fetches a single position by id", async () => {
    const client = buildClient(RAW_POSITION);
    const service = new MetaTrader5PositionService(client);

    const position = await service.getPosition("pos-1");

    expect(client.request).toHaveBeenCalledWith("GET", "/positions/pos-1");
    expect(position.positionId).toBe("pos-1");
  });
});
