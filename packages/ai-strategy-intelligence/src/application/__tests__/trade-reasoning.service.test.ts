import { describe, expect, it, vi } from "vitest";
import { TradeReasoningService } from "../services/trade-reasoning.service";
import { buildStrategy, buildSymbolCode } from "./fakes";

describe("TradeReasoningService", () => {
  const service = new TradeReasoningService();

  it("describes entry/exit rule counts and descriptions without live evaluation when no engine is supplied", async () => {
    const strategy = buildStrategy({ entryRuleCount: 2, exitRuleCount: 1 });
    const symbolCode = buildSymbolCode();

    const reasoning = await service.reason(strategy, symbolCode);
    expect(reasoning.entryRulesConsidered).toBe(2);
    expect(reasoning.exitRulesConsidered).toBe(1);
    expect(reasoning.liveEntrySignalActive).toBeNull();
    expect(reasoning.narrative).toContain("Entry condition 1");
  });

  it("folds a live entry-signal check into the narrative when a StrategyEngine is supplied", async () => {
    const strategy = buildStrategy();
    const symbolCode = buildSymbolCode();
    const engine = { evaluateRule: vi.fn(), isEntrySignalActive: vi.fn().mockResolvedValue(true) };

    const reasoning = await service.reason(strategy, symbolCode, engine);
    expect(reasoning.liveEntrySignalActive).toBe(true);
    expect(reasoning.narrative).toContain("ACTIVE");
    expect(engine.isEntrySignalActive).toHaveBeenCalledWith(strategy);
  });
});
