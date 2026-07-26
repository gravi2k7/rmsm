import { describe, expect, it } from "vitest";
import { ExecutiveSummaryService } from "../services/executive-summary.service";
import { buildPortfolioReport, buildRiskReport, buildPerformanceReport, FixedClock } from "./fakes";

describe("ExecutiveSummaryService", () => {
  it("composes portfolio + risk + performance reports into one headline and key points, without recomputing any of them", () => {
    const summary = new ExecutiveSummaryService(new FixedClock()).summarize(buildPortfolioReport(), buildRiskReport(), buildPerformanceReport());

    expect(summary.headline).toContain("HEALTHY");
    expect(summary.headline).toContain("ACCEPTABLE");
    expect(summary.keyPoints).toHaveLength(3);
  });
});
