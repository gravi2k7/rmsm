import type { Clock, IdGenerator } from "@rmsm/core";
import type { Portfolio } from "@rmsm/portfolio";
import { MemoryType } from "@rmsm/ai-memory";
import type { MemoryService, Summarizer } from "@rmsm/ai-memory";
import type { PortfolioHealth } from "../../domain/entities/portfolio-health.entity";
import type { DiversificationAnalysis } from "../../domain/entities/diversification-analysis.entity";
import type { PortfolioSummary } from "../../domain/entities/portfolio-summary.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { PortfolioHealthAssessedEvent } from "../../events/portfolio-intelligence-domain-events.interface";

/**
 * The flagship composing service — mirrors AI-601/602/603's own
 * summary/report services: wires `PortfolioHealth` and
 * `DiversificationAnalysis` (both produced elsewhere in this package,
 * never recomputed here) into one narrative `PortfolioSummary`. When an
 * AI-203 `MemoryService` is injected, every summary is ALSO stored as a
 * `MemoryType.SEMANTIC` entry.
 */
export class PortfolioSummaryService {
  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly summarizer?: Summarizer,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(portfolio: Portfolio, health: PortfolioHealth, diversification: DiversificationAnalysis): Promise<PortfolioSummary> {
    const rawNarrative = [
      `Portfolio ${portfolio.id} health is ${health.verdict}.`,
      health.reasons.join(" "),
      `Diversification is ${diversification.level} (HHI ${diversification.herfindahlIndex.toFixed(2)}). ${diversification.reason}`,
      `Cash balance is ${portfolio.cashBalance.toFixed(2)}, buying power is ${portfolio.buyingPower.toFixed(2)}, ${portfolio.openPositions.length} open position(s).`,
    ].join(" ");

    const narrative = this.summarizer ? await this.summarizer.summarize(rawNarrative, 4) : rawNarrative;
    const now = this.clock.now();
    const summary: PortfolioSummary = { portfolioId: portfolio.id, health, diversification, narrative, generatedAt: now };

    if (this.memoryService) {
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        content: narrative,
        metadata: { tags: ["portfolio-intelligence", portfolio.id, health.verdict], source: "ai-portfolio-intelligence", author: "PortfolioSummaryService" },
      });
    }

    if (this.eventPublisher) {
      const event: PortfolioHealthAssessedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "PortfolioHealthAssessed",
        occurredAt: now,
        aggregateId: portfolio.id,
        portfolioId: portfolio.id,
        verdict: health.verdict,
      };
      await this.eventPublisher.publish([event]);
    }

    return summary;
  }
}
