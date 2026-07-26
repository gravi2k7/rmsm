import { describe, expect, it } from "vitest";
import { MarketAlertService } from "../services/market-alert.service";
import { MarketAlertSeverity } from "../../domain/enums/market-intelligence.enum";
import { buildCandles } from "./fakes";

describe("MarketAlertService", () => {
  const service = new MarketAlertService();

  it("raises a CRITICAL alert for extreme volatility", () => {
    const candles = buildCandles([1, 2, 1, 3, 1, 4]);
    const alerts = service.evaluate(candles);
    expect(alerts.some((a) => a.severity === MarketAlertSeverity.CRITICAL && a.code === "EXTREME_VOLATILITY")).toBe(true);
  });

  it("raises a WARNING alert for low liquidity", () => {
    const candles = buildCandles([1.1, 1.1, 1.1], [10, 5, 8]);
    const alerts = service.evaluate(candles);
    expect(alerts.some((a) => a.code === "LOW_LIQUIDITY")).toBe(true);
  });

  it("raises no alerts for calm, liquid conditions", () => {
    const candles = buildCandles([1.1, 1.1001, 1.1, 1.1001], [5000, 5000, 5000, 5000]);
    expect(service.evaluate(candles)).toEqual([]);
  });
});
