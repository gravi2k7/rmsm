import { describe, expect, it } from "vitest";
import { IntentClassificationService } from "../services/intent-classification.service";
import { CopilotIntent } from "../../domain/enums/trading-copilot.enum";

describe("IntentClassificationService", () => {
  const service = new IntentClassificationService();

  it("classifies a risk-related question as RISK_QUESTION", () => {
    expect(service.classify("What's my drawdown risk right now?")).toBe(CopilotIntent.RISK_QUESTION);
  });

  it("classifies a market-related question as MARKET_QUESTION", () => {
    expect(service.classify("What's the current market trend?")).toBe(CopilotIntent.MARKET_QUESTION);
  });

  it("classifies an unrecognized question as GENERAL", () => {
    expect(service.classify("What time is it?")).toBe(CopilotIntent.GENERAL);
  });
});
