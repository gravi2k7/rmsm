// AI-608: Trading Copilot — trading/portfolio/market/strategy assistant,
// NL Q&A, trading explanations, decision support, research assistance,
// context-aware conversations. The deepest cross-package AI-6xx
// integration: composes AI-301 (@rmsm/ai-chat) for conversation
// orchestration, AI-303 (@rmsm/ai-research) for research, AI-203
// (@rmsm/ai-memory) for conversation/insight storage, AI-401
// (@rmsm/ai-agents) for agent-context awareness, and AI-601/602/605
// (@rmsm/ai-market-intelligence, @rmsm/ai-strategy-intelligence,
// @rmsm/ai-risk-intelligence) for the actual trading answers — never
// reimplements any of their logic, only routes to and composes it.

export { CopilotIntent, COPILOT_INTENTS, DecisionSupportVerdict, DECISION_SUPPORT_VERDICTS } from "./domain/enums/trading-copilot.enum";

export type { CopilotAnswer } from "./domain/entities/copilot-answer.entity";
export type { TradingExplanation } from "./domain/entities/trading-explanation.entity";
export type { DecisionSupportResult } from "./domain/entities/decision-support-result.entity";
export type { ResearchAssistanceResult } from "./domain/entities/research-assistance-result.entity";
export type { CopilotSessionSummary } from "./domain/entities/copilot-session-summary.entity";

export { UnroutableQuestionError } from "./domain/errors/trading-copilot-domain.errors";

export type { TradingCopilotDomainEvent, CopilotQuestionAnsweredEvent } from "./events/trading-copilot-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { IntentClassificationService } from "./application/services/intent-classification.service";
export { CopilotToolRegistryService, type CopilotToolSpec } from "./application/services/copilot-tool-registry.service";
export { CopilotQAService } from "./application/services/copilot-qa.service";
export { TradingExplanationService } from "./application/services/trading-explanation.service";
export { DecisionSupportService } from "./application/services/decision-support.service";
export { ResearchAssistanceService, type ResearchAssistanceDeps } from "./application/services/research-assistance.service";
export { ContextAwareConversationService } from "./application/services/context-aware-conversation.service";
export { CopilotSessionSummaryService } from "./application/services/copilot-session-summary.service";

export { InMemoryEventPublisher, type TradingCopilotEventListener } from "./infrastructure/in-memory-event-publisher";
