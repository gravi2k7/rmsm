import type { RiskAlertSeverity } from "../enums/risk-intelligence.enum";

export interface RiskAlert {
  readonly severity: RiskAlertSeverity;
  readonly code: string;
  readonly message: string;
}
