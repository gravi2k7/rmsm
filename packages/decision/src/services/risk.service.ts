import { randomUUID } from "node:crypto";
import { ok, err, type Result } from "@rmsm/core";
import type { SymbolCode } from "@rmsm/market";
import type { RiskEngine } from "../interfaces/risk-engine.interface";
import { RiskAssessment, type RiskChecks } from "../entities/risk-assessment";
import { PositionSize } from "../entities/position-size";
import { RiskScore } from "../value-objects/risk-score";
import { InvalidPositionSizeError } from "../errors/decision.errors";

export interface RiskLimits {
  readonly maxDailyLossFraction: number;
  readonly maxPositionSizeFraction: number;
  readonly maxExposureFraction: number;
  readonly maxCorrelation: number;
  readonly minMarginBufferFraction: number;
}

/**
 * Runs the platform's own five required risk checks (Maximum Daily
 * Loss, Maximum Position Size, Exposure Limits, Correlation Check,
 * Margin Check) against live account/exposure data sourced through
 * `RiskEngine` (constructor-injected), and computes a `PositionSize`
 * from a caller-supplied risk-per-trade fraction and stop distance —
 * real domain calculations, not infrastructure.
 */
export class RiskService {
  constructor(private readonly riskEngine: RiskEngine) {}

  async assess(symbolCode: SymbolCode, proposedRiskFraction: number, limits: RiskLimits): Promise<RiskAssessment> {
    const account = await this.riskEngine.getAccountSnapshot();
    const correlation = await this.riskEngine.getCorrelationWithOpenPositions(symbolCode);

    const dailyLossFraction = account.dailyPnL < 0 ? Math.abs(account.dailyPnL) / account.equity : 0;
    const marginBufferFraction = account.equity > 0 ? account.availableMargin / account.equity : 0;

    const checks: RiskChecks = {
      maxDailyLoss: {
        passed: dailyLossFraction <= limits.maxDailyLossFraction,
        message: `daily loss ${(dailyLossFraction * 100).toFixed(2)}% vs limit ${(limits.maxDailyLossFraction * 100).toFixed(2)}%`,
      },
      maxPositionSize: {
        passed: proposedRiskFraction <= limits.maxPositionSizeFraction,
        message: `proposed risk ${(proposedRiskFraction * 100).toFixed(2)}% vs limit ${(limits.maxPositionSizeFraction * 100).toFixed(2)}%`,
      },
      exposureLimits: {
        passed: account.openPositionCount < 1 / Math.max(limits.maxExposureFraction, 0.0001),
        message: `${account.openPositionCount} open positions`,
      },
      correlationCheck: {
        passed: Math.abs(correlation) <= limits.maxCorrelation,
        message: `correlation ${correlation.toFixed(2)} vs limit ${limits.maxCorrelation.toFixed(2)}`,
      },
      marginCheck: {
        passed: marginBufferFraction >= limits.minMarginBufferFraction,
        message: `margin buffer ${(marginBufferFraction * 100).toFixed(2)}% vs required ${(limits.minMarginBufferFraction * 100).toFixed(2)}%`,
      },
    };

    const failedCount = Object.values(checks).filter((c) => !c.passed).length;
    const overallScoreResult = RiskScore.create(Math.min(100, failedCount * 25 + dailyLossFraction * 50));
    const overallScore = overallScoreResult.ok ? overallScoreResult.value : this.fallbackMaxScore();

    return RiskAssessment.create(randomUUID(), { checks, overallScore, assessedAt: new Date() });
  }

  /** Sizes a position so that `riskAmount` (equity × `riskPerTradeFraction`)
   * corresponds to `stopDistanceUnits` worth of adverse price movement —
   * the standard "risk-based position sizing" formula: units = riskAmount / stopDistance.
   * `PositionSize.create()` throws via `Guard` on an invalid result (e.g.
   * a zero stop distance producing non-positive units); caught here and
   * converted to a `Result`, so this service's own public API stays
   * consistently `Result`-based even though the entity underneath it
   * uses the throwing `Guard` convention for its own construction-time
   * invariants. */
  async calculatePositionSize(
    symbolCode: SymbolCode,
    riskPerTradeFraction: number,
    stopDistanceUnits: number,
  ): Promise<Result<PositionSize, InvalidPositionSizeError>> {
    const account = await this.riskEngine.getAccountSnapshot();
    const riskAmount = account.equity * riskPerTradeFraction;
    const units = stopDistanceUnits > 0 ? riskAmount / stopDistanceUnits : 0;

    try {
      const positionSize = PositionSize.create(randomUUID(), {
        symbolCode,
        units,
        calculationBasis: `${(riskPerTradeFraction * 100).toFixed(2)}% account risk / ${stopDistanceUnits} unit stop`,
        accountEquity: account.equity,
        riskAmount,
      });
      return ok(positionSize);
    } catch (error) {
      return err(new InvalidPositionSizeError(error instanceof Error ? error.message : String(error)));
    }
  }

  private fallbackMaxScore(): RiskScore {
    const result = RiskScore.create(100);
    if (!result.ok) throw new Error("unreachable: 100 is always a valid RiskScore");
    return result.value;
  }
}
