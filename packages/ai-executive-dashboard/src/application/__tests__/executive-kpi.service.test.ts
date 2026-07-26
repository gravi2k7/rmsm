import { describe, expect, it } from "vitest";
import { PerformanceService } from "@rmsm/portfolio";
import { PortfolioHealthVerdict } from "@rmsm/ai-portfolio-intelligence";
import { ExecutiveKpiService } from "../services/executive-kpi.service";

describe("ExecutiveKpiService", () => {
  it("relabels REAL @rmsm/portfolio PerformanceMetrics into named KPIs, without recomputing them", () => {
    const performance = new PerformanceService().computeMetrics([], []);
    const health = { portfolioId: "p1", verdict: PortfolioHealthVerdict.HEALTHY, reasons: ["All health checks passed."] };

    const kpiSet = new ExecutiveKpiService().build("p1", performance, health);
    expect(kpiSet.kpis.find((k) => k.name === "Win Rate")?.value).toBe(performance.winRate);
    expect(kpiSet.kpis.find((k) => k.name === "Total Trades")?.value).toBe(performance.totalTrades);
    expect(kpiSet.kpis).toHaveLength(7);
  });
});
