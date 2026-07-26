import { CopilotIntent } from "../../domain/enums/trading-copilot.enum";

const KEYWORDS: ReadonlyArray<readonly [CopilotIntent, readonly string[]]> = [
  [CopilotIntent.RISK_QUESTION, ["risk", "drawdown", "exposure", "safe"]],
  [CopilotIntent.STRATEGY_QUESTION, ["strategy", "should i trade", "entry", "exit rule"]],
  [CopilotIntent.RESEARCH_REQUEST, ["research", "find out", "look into", "investigate"]],
  [CopilotIntent.MARKET_QUESTION, ["market", "trend", "price", "regime", "volatility"]],
];

/** Deterministic keyword routing — no LLM, the same provider-
 * independence discipline every heuristic default in this platform
 * follows. */
export class IntentClassificationService {
  classify(question: string): CopilotIntent {
    const text = question.toLowerCase();
    for (const [intent, keywords] of KEYWORDS) {
      if (keywords.some((keyword) => text.includes(keyword))) return intent;
    }
    return CopilotIntent.GENERAL;
  }
}
