import { describe, expect, it } from "vitest";
import { RiskAlertService } from "../services/risk-alert.service";
import { RiskVerdict, RiskAlertSeverity } from "../../domain/enums/risk-intelligence.enum";

describe("RiskAlertService", () => {
  const service = new RiskAlertService();

  it("raises a CRITICAL alert for a CRITICAL risk verdict", () => {
    const riskAnalysis = { subjectId: "s1", verdict: RiskVerdict.CRITICAL, overallScore: 90, reasons: ["marginCheck check failed."] };
    const drawdown = { portfolioId: "p1", currentDrawdownPercentage: 2, historicalMaxDrawdownPercentage: 5, verdict: RiskVerdict.ACCEPTABLE, reason: "" };
    const exposure = { portfolioId: "p1", exposures: [], anyBreached: false };

    const alerts = service.evaluate(riskAnalysis, drawdown, exposure);
    expect(alerts.some((a) => a.severity === RiskAlertSeverity.CRITICAL && a.code === "CRITICAL_RISK_ASSESSMENT")).toBe(true);
  });

  it("raises an exposure-breach alert per breached scope", () => {
    const riskAnalysis = { subjectId: "s1", verdict: RiskVerdict.ACCEPTABLE, overallScore: 10, reasons: [] };
    const drawdown = { portfolioId: "p1", currentDrawdownPercentage: 2, historicalMaxDrawdownPercentage: 5, verdict: RiskVerdict.ACCEPTABLE, reason: "" };
    const exposure = { portfolioId: "p1", exposures: [{ scope: "SYMBOL", scopeId: "EURUSD", percentage: 80, limitPercentage: 50, withinLimit: false }], anyBreached: true };

    const alerts = service.evaluate(riskAnalysis, drawdown, exposure);
    expect(alerts.some((a) => a.code === "EXPOSURE_LIMIT_BREACHED")).toBe(true);
  });

  it("raises no alerts when everything is ACCEPTABLE and within limits", () => {
    const riskAnalysis = { subjectId: "s1", verdict: RiskVerdict.ACCEPTABLE, overallScore: 10, reasons: [] };
    const drawdown = { portfolioId: "p1", currentDrawdownPercentage: 2, historicalMaxDrawdownPercentage: 5, verdict: RiskVerdict.ACCEPTABLE, reason: "" };
    const exposure = { portfolioId: "p1", exposures: [{ scope: "PORTFOLIO", percentage: 10, limitPercentage: 50, withinLimit: true }], anyBreached: false };

    expect(service.evaluate(riskAnalysis, drawdown, exposure)).toEqual([]);
  });
});
