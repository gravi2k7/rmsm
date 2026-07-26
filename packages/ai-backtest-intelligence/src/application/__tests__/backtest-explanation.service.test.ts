import { describe, expect, it } from "vitest";
import { BacktestExplanationService } from "../services/backtest-explanation.service";
import { BacktestVerdict } from "../../domain/enums/backtest-intelligence.enum";

describe("BacktestExplanationService", () => {
  const service = new BacktestExplanationService();

  it("composes interpretation + performance summary + patterns into one narrative", () => {
    const interpretation = { runId: "run-1", verdict: BacktestVerdict.STRONG, reasons: [] };
    const performanceSummary = { runId: "run-1", narrative: "3 trade(s). Win rate 66%." };
    const patterns = { runId: "run-1", patterns: [] };

    const explanation = service.explain("run-1", interpretation, performanceSummary, patterns);
    expect(explanation.narrative).toContain("STRONG");
    expect(explanation.narrative).toContain("Win rate 66%");
    expect(explanation.narrative).toContain("No notable trade patterns");
  });
});
