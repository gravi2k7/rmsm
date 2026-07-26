import type { IdGenerator } from "@rmsm/core";
import type { ToolRegistry } from "@rmsm/ai-chat";
import { IntentClassificationService } from "./intent-classification.service";
import type { CopilotAnswer } from "../../domain/entities/copilot-answer.entity";
import { CopilotIntent } from "../../domain/enums/trading-copilot.enum";
import { UnroutableQuestionError } from "../../domain/errors/trading-copilot-domain.errors";

const INTENT_TOOL_NAMES: Readonly<Record<string, string>> = {
  [CopilotIntent.MARKET_QUESTION]: "get_market_summary",
  [CopilotIntent.STRATEGY_QUESTION]: "get_strategy_report",
  [CopilotIntent.RISK_QUESTION]: "get_risk_analysis",
};

/**
 * NL Q&A: classifies intent, then invokes the matching tool on a REAL,
 * unmodified `@rmsm/ai-chat` (AI-301) `ToolRegistry` — never computes a
 * market/strategy/risk answer itself, only routes to the handler that
 * already wraps the real AI-601/602/605 service.
 */
export class CopilotQAService {
  constructor(
    private readonly intentService: IntentClassificationService,
    private readonly idGenerator: IdGenerator,
  ) {}

  async answer(toolRegistry: ToolRegistry, sessionId: string, question: string, args: Readonly<Record<string, unknown>> = {}): Promise<CopilotAnswer> {
    const intent = this.intentService.classify(question);
    const toolName = INTENT_TOOL_NAMES[intent];

    if (!toolName || !toolRegistry.get(toolName)) {
      throw new UnroutableQuestionError(question);
    }

    const result = await toolRegistry.invoke({ id: this.idGenerator.generate(), toolName, arguments: args });
    return { sessionId, question, intent, answer: result.content, sourceTool: toolName };
  }
}
