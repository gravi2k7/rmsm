import { describe, expect, it } from "vitest";
import { SignalRankingService } from "../services/signal-ranking.service";
import { EmptySignalSetError } from "../../domain/errors/signal-intelligence-domain.errors";
import { buildOpportunity } from "./fakes";

describe("SignalRankingService", () => {
  const service = new SignalRankingService();

  it("ranks the higher-composite-score opportunity first", () => {
    const strong = buildOpportunity({ id: "strong", signalMagnitude: 0.95, confidenceScore: 95 });
    const weak = buildOpportunity({ id: "weak", signalMagnitude: 0.1, confidenceScore: 15 });

    const ranking = service.rank([weak, strong]);
    expect(ranking.rankedOpportunityIds[0]).toBe("strong");
    expect(ranking.rankedOpportunityIds[1]).toBe("weak");
  });

  it("throws EmptySignalSetError for an empty list", () => {
    expect(() => service.rank([])).toThrow(EmptySignalSetError);
  });
});
