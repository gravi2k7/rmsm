import type { Trade } from "@rmsm/portfolio";
import type { TradePattern, PatternDetectionResult } from "../../domain/entities/trade-pattern.entity";
import { TradePatternType } from "../../domain/enums/backtest-intelligence.enum";
import { EmptyTradeSetError } from "../../domain/errors/backtest-intelligence-domain.errors";

const STREAK_THRESHOLD = 3;
const OVERTRADING_THRESHOLD_PER_DAY = 5;
const LARGE_LOSS_THRESHOLD = 1000;

/** Detects streaks, overtrading days, and large-loss outliers purely
 * from REAL, unmodified `@rmsm/portfolio` `Trade` records ordered by
 * `closedAt` — never recomputes any trade's own P&L or win/loss status. */
export class PatternDetectionService {
  detect(runId: string, trades: readonly Trade[]): PatternDetectionResult {
    if (trades.length === 0) throw new EmptyTradeSetError();

    const sorted = [...trades].sort((a, b) => a.closedAt.getTime() - b.closedAt.getTime());
    const patterns: TradePattern[] = [];

    let winStreak = 0;
    let lossStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    for (const trade of sorted) {
      if (trade.isWin()) {
        winStreak += 1;
        lossStreak = 0;
      } else {
        lossStreak += 1;
        winStreak = 0;
      }
      maxWinStreak = Math.max(maxWinStreak, winStreak);
      maxLossStreak = Math.max(maxLossStreak, lossStreak);
    }
    if (maxWinStreak >= STREAK_THRESHOLD) {
      patterns.push({ type: TradePatternType.WINNING_STREAK, description: `Longest winning streak was ${maxWinStreak} consecutive trades.`, occurrences: maxWinStreak });
    }
    if (maxLossStreak >= STREAK_THRESHOLD) {
      patterns.push({ type: TradePatternType.LOSING_STREAK, description: `Longest losing streak was ${maxLossStreak} consecutive trades.`, occurrences: maxLossStreak });
    }

    const tradesByDay = new Map<string, number>();
    for (const trade of sorted) {
      const dayKey = trade.closedAt.toISOString().slice(0, 10);
      tradesByDay.set(dayKey, (tradesByDay.get(dayKey) ?? 0) + 1);
    }
    const overtradingDays = [...tradesByDay.values()].filter((count) => count > OVERTRADING_THRESHOLD_PER_DAY).length;
    if (overtradingDays > 0) {
      patterns.push({ type: TradePatternType.OVERTRADING_DAY, description: `${overtradingDays} day(s) had more than ${OVERTRADING_THRESHOLD_PER_DAY} trades.`, occurrences: overtradingDays });
    }

    const largeLosses = sorted.filter((t) => t.realizedPnl < -LARGE_LOSS_THRESHOLD).length;
    if (largeLosses > 0) {
      patterns.push({ type: TradePatternType.LARGE_LOSS_OUTLIER, description: `${largeLosses} trade(s) lost more than ${LARGE_LOSS_THRESHOLD}.`, occurrences: largeLosses });
    }

    return { runId, patterns };
  }
}
