import { describe, expect, it } from "vitest";
import { StressScenarioService } from "../services/stress-scenario.service";
import { EmptyStressScenarioSetError } from "../../domain/errors/risk-intelligence-domain.errors";

describe("StressScenarioService", () => {
  const service = new StressScenarioService();

  it("projects lower equity and flags a breach for a severe shock", () => {
    const results = service.simulate("p1", 100_000, 110_000, 50_000, 20, [{ scenarioName: "Severe Shock", shockPercentage: 40 }]);
    expect(results[0]?.projectedEquity).toBe(80_000);
    expect(results[0]?.breachesLimit).toBe(true);
  });

  it("does not flag a breach for a mild shock", () => {
    const results = service.simulate("p1", 100_000, 105_000, 20_000, 20, [{ scenarioName: "Mild Shock", shockPercentage: 5 }]);
    expect(results[0]?.breachesLimit).toBe(false);
  });

  it("throws EmptyStressScenarioSetError for an empty scenario list", () => {
    expect(() => service.simulate("p1", 100_000, 100_000, 0, 20, [])).toThrow(EmptyStressScenarioSetError);
  });
});
