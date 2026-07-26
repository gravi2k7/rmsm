import { describe, expect, it } from "vitest";
import { PortfolioRecommendationService } from "../services/portfolio-recommendation.service";
import { PortfolioRecommendationAction, PortfolioHealthVerdict, DiversificationLevel } from "../../domain/enums/portfolio-intelligence.enum";

describe("PortfolioRecommendationService", () => {
  const service = new PortfolioRecommendationService();

  it("recommends REDUCE_RISK when exposure is over its limit, regardless of health", () => {
    const recommendation = service.recommend(
      "p1",
      { portfolioId: "p1", verdict: PortfolioHealthVerdict.HEALTHY, reasons: [] },
      { portfolioId: "p1", level: DiversificationLevel.WELL_DIVERSIFIED, herfindahlIndex: 0.1, reason: "" },
      { portfolioId: "p1", scope: "PORTFOLIO", percentage: 80, limitPercentage: 50, withinLimit: false },
    );
    expect(recommendation.action).toBe(PortfolioRecommendationAction.REDUCE_RISK);
  });

  it("recommends DIVERSIFY for a healthy but concentrated portfolio", () => {
    const recommendation = service.recommend(
      "p1",
      { portfolioId: "p1", verdict: PortfolioHealthVerdict.HEALTHY, reasons: [] },
      { portfolioId: "p1", level: DiversificationLevel.CONCENTRATED, herfindahlIndex: 0.6, reason: "concentrated" },
      { portfolioId: "p1", scope: "PORTFOLIO", percentage: 20, limitPercentage: 50, withinLimit: true },
    );
    expect(recommendation.action).toBe(PortfolioRecommendationAction.DIVERSIFY);
  });

  it("recommends HOLD for a healthy, well-diversified, within-limit portfolio", () => {
    const recommendation = service.recommend(
      "p1",
      { portfolioId: "p1", verdict: PortfolioHealthVerdict.HEALTHY, reasons: [] },
      { portfolioId: "p1", level: DiversificationLevel.WELL_DIVERSIFIED, herfindahlIndex: 0.1, reason: "" },
      { portfolioId: "p1", scope: "PORTFOLIO", percentage: 20, limitPercentage: 50, withinLimit: true },
    );
    expect(recommendation.action).toBe(PortfolioRecommendationAction.HOLD);
  });
});
