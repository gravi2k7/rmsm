import type { WidgetType } from "../enums/executive-dashboard.enum";

/** A uniform presentation shape every AI-601..605 narrative maps into —
 * this package never generates the narrative itself, only wraps an
 * already-real one (`MarketSummary.narrative`,
 * `StrategyIntelligenceReport.narrative`, etc.) for dashboard display. */
export interface DashboardWidget {
  readonly id: string;
  readonly type: WidgetType;
  readonly title: string;
  readonly body: string;
  readonly generatedAt: Date;
}
