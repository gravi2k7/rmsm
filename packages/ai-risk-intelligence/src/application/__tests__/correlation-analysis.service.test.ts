import { describe, expect, it } from "vitest";
import { CorrelationAnalysisService } from "../services/correlation-analysis.service";
import { CorrelationLevel } from "../../domain/enums/risk-intelligence.enum";
import { EmptyCorrelationSetError } from "../../domain/errors/risk-intelligence-domain.errors";

describe("CorrelationAnalysisService", () => {
  const service = new CorrelationAnalysisService();

  it("classifies coefficients into LOW/MODERATE/HIGH and tracks the max absolute value", () => {
    const result = service.analyze("EURUSD", [
      { withSymbolCode: "GBPUSD", coefficient: 0.85 },
      { withSymbolCode: "USDJPY", coefficient: -0.5 },
      { withSymbolCode: "AUDUSD", coefficient: 0.1 },
    ]);

    expect(result.correlations.find((c) => c.withSymbolCode === "GBPUSD")?.level).toBe(CorrelationLevel.HIGH);
    expect(result.correlations.find((c) => c.withSymbolCode === "USDJPY")?.level).toBe(CorrelationLevel.MODERATE);
    expect(result.correlations.find((c) => c.withSymbolCode === "AUDUSD")?.level).toBe(CorrelationLevel.LOW);
    expect(result.maxAbsoluteCorrelation).toBeCloseTo(0.85, 5);
  });

  it("throws EmptyCorrelationSetError for an empty list", () => {
    expect(() => service.analyze("EURUSD", [])).toThrow(EmptyCorrelationSetError);
  });
});
