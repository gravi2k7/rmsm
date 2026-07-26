import { describe, expect, it } from "vitest";
import { unwrap } from "@rmsm/core";
import { SymbolCode, Candle, Price, Volume, Timeframe } from "@rmsm/market";
import { MarketAnalysisService, MarketRegimeService } from "@rmsm/ai-market-intelligence";
import { CopilotToolRegistryService } from "../services/copilot-tool-registry.service";
import { CopilotQAService } from "../services/copilot-qa.service";
import { IntentClassificationService } from "../services/intent-classification.service";
import { CopilotIntent } from "../../domain/enums/trading-copilot.enum";
import { UnroutableQuestionError } from "../../domain/errors/trading-copilot-domain.errors";
import { SequentialIdGenerator } from "./fakes";

function buildCandles(closes: readonly number[]): Candle[] {
  const symbolCode = unwrap(SymbolCode.create("EURUSD"));
  return closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1]!;
    const high = Math.max(open, close) + 0.0005;
    const low = Math.min(open, close) - 0.0005;
    const price = (amount: number) => unwrap(Price.create(amount, 5));
    return Candle.hydrate(`c-${index}`, symbolCode, Timeframe.M1, new Date(Date.UTC(2026, 0, 1, 0, index)), price(open), price(high), price(low), price(close), unwrap(Volume.create(1000)));
  });
}

describe("CopilotQAService", () => {
  it("routes a market question to a REAL AI-601 MarketRegimeService via a REAL AI-301 ToolRegistry", async () => {
    const marketAnalysis = new MarketAnalysisService();
    const regimeService = new MarketRegimeService(marketAnalysis);
    const candles = buildCandles([1.1, 1.11, 1.12, 1.13, 1.14, 1.15]);

    const toolRegistry = new CopilotToolRegistryService().build([
      {
        definition: { name: "get_market_summary", description: "Get current market regime", parametersSchema: {} },
        handler: async (call) => {
          const regime = regimeService.detect(candles);
          return { toolCallId: call.id, toolName: call.toolName, content: `Regime: ${regime.regime} (${regime.reason})`, isError: false };
        },
      },
    ]);

    const service = new CopilotQAService(new IntentClassificationService(), new SequentialIdGenerator());
    const answer = await service.answer(toolRegistry, "session-1", "What's the current market trend?");

    expect(answer.intent).toBe(CopilotIntent.MARKET_QUESTION);
    expect(answer.sourceTool).toBe("get_market_summary");
    expect(answer.answer).toContain("Regime:");
  });

  it("throws UnroutableQuestionError when no tool is registered for the classified intent", async () => {
    const toolRegistry = new CopilotToolRegistryService().build([]);
    const service = new CopilotQAService(new IntentClassificationService(), new SequentialIdGenerator());

    await expect(service.answer(toolRegistry, "session-1", "What's the current market trend?")).rejects.toThrow(UnroutableQuestionError);
  });
});
