import type { StrategyPerformanceProvider } from "../../repositories/strategy-performance-provider.interface";
import type { StrategyPerformanceSummary } from "../../domain/entities/strategy-performance-summary.entity";
import type { Clock } from "@rmsm/core";
import { SystemClock } from "@rmsm/core";

/** Delegates entirely to a `StrategyPerformanceProvider` (a future,
 * currently-unimplemented port) — returns `null`, explicitly, rather
 * than fabricating numbers, when no provider is wired in or the
 * provider itself has no data for this strategy yet. */
export class StrategyPerformanceAnalysisService {
  constructor(
    private readonly provider: StrategyPerformanceProvider | undefined,
    private readonly clock: Clock = new SystemClock(),
  ) {}

  async analyze(strategyId: string): Promise<StrategyPerformanceSummary | null> {
    if (!this.provider) return null;
    const performance = await this.provider.getPerformance(strategyId);
    if (!performance) return null;
    return { strategyId, ...performance, generatedAt: this.clock.now() };
  }
}
