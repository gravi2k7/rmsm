import type { Strategy, StrategyEngine } from "@rmsm/strategy";
import type { SymbolCode } from "@rmsm/market";
import type { TradeReasoning } from "../../domain/entities/trade-reasoning.entity";

/**
 * Explains, in natural language, WHY a strategy would or wouldn't
 * trade — from the rules' own `description` data (never their raw
 * `expression`, and never evaluated here). When a real `StrategyEngine`
 * port is supplied, also asks it — the one real thing this package is
 * allowed to ask of live evaluation — whether the entry signal is
 * active right now, and folds that single fact into the narrative
 * without ever touching rule evaluation itself.
 */
export class TradeReasoningService {
  async reason(strategy: Strategy, symbolCode: SymbolCode, engine?: StrategyEngine): Promise<TradeReasoning> {
    const version = strategy.currentVersion;
    const entryRules = version?.entryRules.filter((r) => r.enabled) ?? [];
    const exitRules = version?.exitRules.filter((r) => r.enabled) ?? [];

    const parts = [`"${strategy.name}" considers ${entryRules.length} entry rule(s) and ${exitRules.length} exit rule(s) for ${symbolCode.value}.`];
    if (entryRules.length > 0) {
      parts.push(`Entry conditions: ${entryRules.map((r) => r.description).join("; ")}.`);
    }
    if (exitRules.length > 0) {
      parts.push(`Exit conditions: ${exitRules.map((r) => r.description).join("; ")}.`);
    }

    let liveEntrySignalActive: boolean | null = null;
    if (engine) {
      liveEntrySignalActive = await engine.isEntrySignalActive(strategy);
      parts.push(liveEntrySignalActive ? "The live entry signal is currently ACTIVE." : "The live entry signal is currently NOT active.");
    }

    return {
      strategyId: strategy.id.value,
      symbolCode: symbolCode.value,
      narrative: parts.join(" "),
      entryRulesConsidered: entryRules.length,
      exitRulesConsidered: exitRules.length,
      liveEntrySignalActive,
    };
  }
}
