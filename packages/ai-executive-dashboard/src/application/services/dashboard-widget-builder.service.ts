import type { IdGenerator, Clock } from "@rmsm/core";
import type { MarketSummary } from "@rmsm/ai-market-intelligence";
import type { StrategyIntelligenceReport } from "@rmsm/ai-strategy-intelligence";
import type { SignalIntelligenceReport } from "@rmsm/ai-signal-intelligence";
import type { PortfolioSummary } from "@rmsm/ai-portfolio-intelligence";
import type { RiskIntelligenceReport } from "@rmsm/ai-risk-intelligence";
import type { DashboardWidget } from "../../domain/entities/dashboard-widget.entity";
import { WidgetType } from "../../domain/enums/executive-dashboard.enum";

/**
 * Maps already-generated AI-601..605 reports into one uniform
 * `DashboardWidget` shape — never recomputes any narrative; each
 * `from*()` method reads only the real, unmodified `.narrative` field
 * its own upstream flagship service already produced.
 */
export class DashboardWidgetBuilderService {
  constructor(
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  fromMarketSummary(summary: MarketSummary): DashboardWidget {
    return { id: this.idGenerator.generate(), type: WidgetType.MARKET, title: `Market — ${summary.symbolCode}`, body: summary.narrative, generatedAt: this.clock.now() };
  }

  fromStrategyReport(report: StrategyIntelligenceReport): DashboardWidget {
    return { id: this.idGenerator.generate(), type: WidgetType.STRATEGY, title: `Strategy — ${report.strategyId}`, body: report.narrative, generatedAt: this.clock.now() };
  }

  fromSignalReport(report: SignalIntelligenceReport): DashboardWidget {
    return { id: this.idGenerator.generate(), type: WidgetType.SIGNAL, title: `Signal — ${report.opportunityId}`, body: report.narrative, generatedAt: this.clock.now() };
  }

  fromPortfolioSummary(summary: PortfolioSummary): DashboardWidget {
    return { id: this.idGenerator.generate(), type: WidgetType.PORTFOLIO, title: `Portfolio — ${summary.portfolioId}`, body: summary.narrative, generatedAt: this.clock.now() };
  }

  fromRiskReport(report: RiskIntelligenceReport): DashboardWidget {
    return { id: this.idGenerator.generate(), type: WidgetType.RISK, title: `Risk — ${report.subjectId}`, body: report.narrative, generatedAt: this.clock.now() };
  }
}
