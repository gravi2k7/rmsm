import type { Candle } from "@rmsm/market";
import { MarketAnalysisService } from "./market-analysis.service";
import { MarketAlertSeverity, VolatilityLevel, LiquidityLevel } from "../../domain/enums/market-intelligence.enum";
import type { MarketAlert } from "../../domain/entities/market-alert.entity";

/** The "market alerts" capability: threshold-based alerts derived from
 * `MarketAnalysisService`'s own volatility/liquidity analyses — no
 * separate alerting computation. */
export class MarketAlertService {
  constructor(private readonly marketAnalysis: MarketAnalysisService = new MarketAnalysisService()) {}

  evaluate(candles: readonly Candle[]): readonly MarketAlert[] {
    const alerts: MarketAlert[] = [];
    const volatility = this.marketAnalysis.analyzeVolatility(candles);
    const liquidity = this.marketAnalysis.analyzeLiquidity(candles);

    if (volatility.level === VolatilityLevel.EXTREME) {
      alerts.push({
        severity: MarketAlertSeverity.CRITICAL,
        code: "EXTREME_VOLATILITY",
        message: `Return volatility (stddev ${volatility.returnStdDev.toFixed(4)}) is extreme.`,
      });
    } else if (volatility.level === VolatilityLevel.HIGH) {
      alerts.push({
        severity: MarketAlertSeverity.WARNING,
        code: "HIGH_VOLATILITY",
        message: `Return volatility (stddev ${volatility.returnStdDev.toFixed(4)}) is elevated.`,
      });
    }

    if (liquidity.level === LiquidityLevel.LOW) {
      alerts.push({
        severity: MarketAlertSeverity.WARNING,
        code: "LOW_LIQUIDITY",
        message: `Average volume (${liquidity.averageVolumeUnits.toFixed(0)} units) is low — expect wider spreads and slippage.`,
      });
    }

    return alerts;
  }
}
