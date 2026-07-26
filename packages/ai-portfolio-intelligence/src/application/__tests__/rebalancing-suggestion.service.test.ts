import { describe, expect, it } from "vitest";
import { RiskMonitorService } from "@rmsm/portfolio";
import { RebalancingSuggestionService } from "../services/rebalancing-suggestion.service";
import { RebalanceAction } from "../../domain/enums/portfolio-intelligence.enum";
import { EmptyExposureSetError } from "../../domain/errors/portfolio-intelligence-domain.errors";
import { buildPortfolio, FakePortfolioCalculator } from "./fakes";

describe("RebalancingSuggestionService", () => {
  const service = new RebalancingSuggestionService();

  it("suggests DECREASE for a symbol far above equal-weight target using REAL Exposure", async () => {
    const portfolio = buildPortfolio("p1", 100_000, [
      { symbolCode: "EURUSD", side: "LONG", quantityUnits: 70_000, averageEntryPrice: 1, marginRequired: 35_000 },
      { symbolCode: "GBPUSD", side: "LONG", quantityUnits: 10_000, averageEntryPrice: 1, marginRequired: 5_000 },
    ]);
    const riskMonitor = new RiskMonitorService(new FakePortfolioCalculator(new Map([["EURUSD", 1], ["GBPUSD", 1]])));
    const eurExposure = await riskMonitor.computeSymbolExposure(portfolio, "EURUSD", 100_000);
    const gbpExposure = await riskMonitor.computeSymbolExposure(portfolio, "GBPUSD", 100_000);

    const suggestions = service.suggest("p1", [
      { symbolCode: "EURUSD", exposure: eurExposure },
      { symbolCode: "GBPUSD", exposure: gbpExposure },
    ]);

    const eurSuggestion = suggestions.find((s) => s.symbolCode === "EURUSD");
    expect(eurSuggestion?.action).toBe(RebalanceAction.DECREASE);
  });

  it("throws EmptyExposureSetError for an empty exposure set", () => {
    expect(() => service.suggest("p1", [])).toThrow(EmptyExposureSetError);
  });
});
