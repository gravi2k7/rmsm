import { describe, expect, it } from "vitest";
import { MarketAnalysisService, MarketRegimeService } from "@rmsm/ai-market-intelligence";
import { MarketSuitabilityService } from "../services/market-suitability.service";
import { SuitabilityLevel } from "../../domain/enums/strategy-intelligence.enum";
import { buildStrategy, buildSymbolCode, buildCandles } from "./fakes";

describe("MarketSuitabilityService", () => {
  const marketAnalysis = new MarketAnalysisService();
  const regimeService = new MarketRegimeService(marketAnalysis);
  const service = new MarketSuitabilityService();

  it("marks a LOW-tolerance strategy UNSUITABLE against REAL extreme-volatility candles from AI-601", () => {
    const strategy = buildStrategy({ riskTolerance: "LOW", supportedSymbols: ["EURUSD"] });
    const symbolCode = buildSymbolCode("EURUSD");
    const candles = buildCandles([1, 2, 1, 3, 1, 4], undefined, symbolCode);

    const volatility = marketAnalysis.analyzeVolatility(candles);
    const regime = regimeService.detect(candles);

    const result = service.assess(strategy, symbolCode, volatility, regime);
    expect(result.level).toBe(SuitabilityLevel.UNSUITABLE);
  });

  it("marks a HIGH-tolerance strategy SUITABLE against REAL calm candles from AI-601", () => {
    const strategy = buildStrategy({ riskTolerance: "HIGH", supportedSymbols: ["EURUSD"] });
    const symbolCode = buildSymbolCode("EURUSD");
    const candles = buildCandles([1.1, 1.1001, 1.1, 1.1001], undefined, symbolCode);

    const volatility = marketAnalysis.analyzeVolatility(candles);
    const regime = regimeService.detect(candles);

    const result = service.assess(strategy, symbolCode, volatility, regime);
    expect(result.level).toBe(SuitabilityLevel.SUITABLE);
  });
});
