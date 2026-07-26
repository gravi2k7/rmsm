import { describe, expect, it } from "vitest";
import { PositionRiskService } from "../services/position-risk.service";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";
import { buildPosition } from "./fakes";

describe("PositionRiskService", () => {
  const service = new PositionRiskService();

  it("rates a small REAL Position's capital-at-risk as ACCEPTABLE", () => {
    const position = buildPosition("pos-1", "EURUSD", "LONG", 5_000, 1);
    const result = service.assess(position, 1, 100_000);
    expect(result.verdict).toBe(RiskVerdict.ACCEPTABLE);
  });

  it("rates a large REAL Position's capital-at-risk as CRITICAL", () => {
    const position = buildPosition("pos-1", "EURUSD", "LONG", 40_000, 1);
    const result = service.assess(position, 1, 100_000);
    expect(result.verdict).toBe(RiskVerdict.CRITICAL);
  });
});
