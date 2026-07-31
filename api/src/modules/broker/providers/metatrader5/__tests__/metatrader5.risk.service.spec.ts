import { MetaTrader5RiskService } from "../metatrader5.risk.service";
import type { MetaTrader5Client } from "../metatrader5.client";
import type { BrokerMarginCalculationRequest, BrokerPositionSizeRequest, BrokerOrderRequest } from "../../../interfaces/broker-models";

function buildClient(response: unknown): MetaTrader5Client {
  return { request: jest.fn().mockResolvedValue(response) } as unknown as MetaTrader5Client;
}

describe("MetaTrader5RiskService", () => {
  it("calculateMargin() delegates directly to POST /risk/margin — no client-side margin math", async () => {
    const result = { requiredMargin: 110, freeMarginAfter: 9_890, marginLevelAfter: 9000 };
    const client = buildClient(result);
    const service = new MetaTrader5RiskService(client);
    const request: BrokerMarginCalculationRequest = { symbol: "EURUSD", volume: 1, side: "BUY" };

    await expect(service.calculateMargin(request)).resolves.toEqual(result);
    expect(client.request).toHaveBeenCalledWith("POST", "/risk/margin", request);
  });

  it("calculatePositionSize() delegates to POST /risk/position-size and unwraps positionSize", async () => {
    const client = buildClient({ positionSize: 0.5 });
    const service = new MetaTrader5RiskService(client);
    const request: BrokerPositionSizeRequest = { symbol: "EURUSD", riskAmount: 100, stopLossDistance: 0.005 };

    await expect(service.calculatePositionSize(request)).resolves.toBe(0.5);
    expect(client.request).toHaveBeenCalledWith("POST", "/risk/position-size", request);
  });

  it("validateOrder() delegates to POST /risk/validate", async () => {
    const validation = { allowed: false, reason: "Insufficient margin" };
    const client = buildClient(validation);
    const service = new MetaTrader5RiskService(client);
    const request: BrokerOrderRequest = { symbol: "EURUSD", type: "MARKET_BUY", volume: 100 };

    await expect(service.validateOrder(request)).resolves.toEqual(validation);
    expect(client.request).toHaveBeenCalledWith("POST", "/risk/validate", request);
  });
});
