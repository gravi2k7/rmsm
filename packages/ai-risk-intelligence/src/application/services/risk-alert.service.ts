import type { RiskAnalysis } from "../../domain/entities/risk-analysis.entity";
import type { DrawdownAnalysis } from "../../domain/entities/drawdown-analysis.entity";
import type { ExposureMonitoringResult } from "../../domain/entities/exposure-monitoring-result.entity";
import type { RiskAlert } from "../../domain/entities/risk-alert.entity";
import { RiskAlertSeverity, RiskVerdict } from "../../domain/enums/risk-intelligence.enum";

/** Derives alerts purely from already-computed `RiskAnalysis` /
 * `DrawdownAnalysis` / `ExposureMonitoringResult` verdicts — never a
 * second risk calculation. */
export class RiskAlertService {
  evaluate(riskAnalysis: RiskAnalysis, drawdown: DrawdownAnalysis, exposure: ExposureMonitoringResult): readonly RiskAlert[] {
    const alerts: RiskAlert[] = [];

    if (riskAnalysis.verdict === RiskVerdict.CRITICAL) {
      alerts.push({ severity: RiskAlertSeverity.CRITICAL, code: "CRITICAL_RISK_ASSESSMENT", message: riskAnalysis.reasons.join(" ") });
    } else if (riskAnalysis.verdict === RiskVerdict.ELEVATED) {
      alerts.push({ severity: RiskAlertSeverity.WARNING, code: "ELEVATED_RISK_ASSESSMENT", message: riskAnalysis.reasons.join(" ") });
    }

    if (drawdown.verdict === RiskVerdict.CRITICAL) {
      alerts.push({ severity: RiskAlertSeverity.CRITICAL, code: "CRITICAL_DRAWDOWN", message: drawdown.reason });
    } else if (drawdown.verdict === RiskVerdict.ELEVATED) {
      alerts.push({ severity: RiskAlertSeverity.WARNING, code: "ELEVATED_DRAWDOWN", message: drawdown.reason });
    }

    if (exposure.anyBreached) {
      const breached = exposure.exposures.filter((e) => !e.withinLimit);
      for (const entry of breached) {
        alerts.push({
          severity: RiskAlertSeverity.WARNING,
          code: "EXPOSURE_LIMIT_BREACHED",
          message: `${entry.scope}${entry.scopeId ? ` (${entry.scopeId})` : ""} exposure is ${entry.percentage.toFixed(0)}%, exceeding its ${entry.limitPercentage}% limit.`,
        });
      }
    }

    return alerts;
  }
}
