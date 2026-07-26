import { describe, expect, it } from "vitest";
import { TradingExplanationService } from "../services/trading-explanation.service";

describe("TradingExplanationService", () => {
  it("presents an already-generated narrative verbatim, without altering it", () => {
    const service = new TradingExplanationService();
    const narrative = "EURUSD is currently in a TRENDING_UP regime.";
    const explanation = service.present("EURUSD", narrative);

    expect(explanation).toEqual({ subjectId: "EURUSD", narrative });
  });
});
