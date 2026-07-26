import { describe, expect, it } from "vitest";
import { ChatOrchestratorService, EchoChatProvider } from "@rmsm/ai-chat";
import { ConversationService, InMemoryConversationProvider } from "@rmsm/ai-memory";
import type { AgentContext } from "@rmsm/ai-agents";
import { ContextAwareConversationService } from "../services/context-aware-conversation.service";
import { SequentialIdGenerator } from "./fakes";

describe("ContextAwareConversationService", () => {
  it("delegates to a REAL, unmodified AI-301 ChatOrchestratorService, folding a REAL AI-401 AgentContext into the message", async () => {
    const conversationService = new ConversationService(new InMemoryConversationProvider());
    const idGenerator = new SequentialIdGenerator();
    const chatOrchestrator = new ChatOrchestratorService(new EchoChatProvider(), conversationService, idGenerator);

    await chatOrchestrator.startSession("session-1");

    const agentContext: AgentContext = { agentId: "agent-1", sessionId: "session-1", goals: [], variables: { symbolCode: "EURUSD" } };
    const service = new ContextAwareConversationService(chatOrchestrator);

    const result = await service.converse("session-1", "What should I know?", agentContext);
    expect(result.content).toContain("echo:");
    expect(result.content).toContain("EURUSD");

    const history = await conversationService.getMessages("session-1");
    expect(history.some((m) => m.content.includes("agent context"))).toBe(true);
  });

  it("sends the message unmodified when no AgentContext is supplied", async () => {
    const conversationService = new ConversationService(new InMemoryConversationProvider());
    const chatOrchestrator = new ChatOrchestratorService(new EchoChatProvider(), conversationService, new SequentialIdGenerator());
    await chatOrchestrator.startSession("session-2");

    const service = new ContextAwareConversationService(chatOrchestrator);
    const result = await service.converse("session-2", "Plain question");
    expect(result.content).toBe("echo: Plain question");
  });
});
