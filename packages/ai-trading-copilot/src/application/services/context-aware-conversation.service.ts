import type { ChatOrchestratorService, ChatCompletionResult } from "@rmsm/ai-chat";
import type { AgentContext } from "@rmsm/ai-agents";

/**
 * Wraps a REAL, unmodified `@rmsm/ai-chat` (AI-301) `ChatOrchestratorService`
 * — never re-implements turn orchestration, tool invocation, or memory
 * persistence itself (all of that is AI-301's own job, which in turn
 * reuses AI-203's `ConversationService`). The only thing this service
 * adds is folding a REAL `@rmsm/ai-agents` (AI-401) `AgentContext`'s own
 * `variables` bag into the outgoing message when a copilot turn
 * originates from an agent run rather than a direct human question —
 * "context-aware conversations" made concrete without touching either
 * package's internals.
 */
export class ContextAwareConversationService {
  constructor(private readonly chatOrchestrator: ChatOrchestratorService) {}

  async converse(sessionId: string, message: string, agentContext?: AgentContext): Promise<ChatCompletionResult> {
    const hasContext = agentContext && Object.keys(agentContext.variables).length > 0;
    const enrichedMessage = hasContext ? `${message} [agent context: ${JSON.stringify(agentContext.variables)}]` : message;
    return this.chatOrchestrator.sendMessage(sessionId, enrichedMessage);
  }
}
