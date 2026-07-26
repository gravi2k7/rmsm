import { describe, expect, it } from "vitest";
import { TradeRiskService } from "../services/trade-risk.service";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";
import { buildTrade } from "./fakes";

describe("TradeRiskService", () => {
  const service = new TradeRiskService();

  it("rates a winning REAL Trade as ACCEPTABLE (zero loss)", () => {
    const trade = buildTrade("t1", "EURUSD", "LONG", 1.1, 1.15);
    const result = service.assess(trade, 100_000);
    expect(result.verdict).toBe(RiskVerdict.ACCEPTABLE);
    expect(result.lossPercentageOfEquity).toBe(0);
  });

  it("rates a large losing REAL Trade as CRITICAL", () => {
    const trade = buildTrade("t1", "EURUSD", "LONG", 1.1, 1.0, 100_000);
    const result = service.assess(trade, 100_000);
    expect(result.verdict).toBe(RiskVerdict.CRITICAL);
  });
});
