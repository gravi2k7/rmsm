import { describe, expect, it } from "vitest";
import { RiskMonitorService } from "@rmsm/portfolio";
import { DiversificationAnalysisService } from "../services/diversification-analysis.service";
import { DiversificationLevel } from "../../domain/enums/portfolio-intelligence.enum";
import { EmptyExposureSetError } from "../../domain/errors/portfolio-intelligence-domain.errors";
import { buildPortfolio, FakePortfolioCalculator } from "./fakes";

describe("DiversificationAnalysisService", () => {
  const service = new DiversificationAnalysisService();

  it("rates a single-symbol, fully-concentrated portfolio CONCENTRATED", async () => {
    const portfolio = buildPortfolio("p1", 100_000, [{ symbolCode: "EURUSD", side: "LONG", quantityUnits: 80_000, averageEntryPrice: 1, marginRequired: 40_000 }]);
    const riskMonitor = new RiskMonitorService(new FakePortfolioCalculator(new Map([["EURUSD", 1]])));
    const exposure = await riskMonitor.computeSymbolExposure(portfolio, "EURUSD", 100_000);

    const result = service.analyze("p1", [{ symbolCode: "EURUSD", exposure }]);
    expect(result.level).toBe(DiversificationLevel.CONCENTRATED);
    expect(result.herfindahlIndex).toBeCloseTo(0.64, 5);
  });

  it("rates an evenly-spread multi-symbol portfolio WELL_DIVERSIFIED", async () => {
    const symbols = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "USDCHF", "EURGBP"];
    const portfolio = buildPortfolio(
      "p2",
      100_000,
      symbols.map((symbolCode) => ({ symbolCode, side: "LONG" as const, quantityUnits: 1250, averageEntryPrice: 1, marginRequired: 625 })),
    );
    const riskMonitor = new RiskMonitorService(new FakePortfolioCalculator(new Map(symbols.map((s) => [s, 1]))));
    const exposures = await Promise.all(symbols.map(async (symbolCode) => ({ symbolCode, exposure: await riskMonitor.computeSymbolExposure(portfolio, symbolCode, 100_000) })));

    const result = service.analyze("p2", exposures);
    expect(result.level).toBe(DiversificationLevel.WELL_DIVERSIFIED);
  });

  it("throws EmptyExposureSetError for an empty exposure set", () => {
    expect(() => service.analyze("p1", [])).toThrow(EmptyExposureSetError);
  });
});
