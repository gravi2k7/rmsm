import { describe, expect, it } from "vitest";
import { ConversationService, InMemoryConversationProvider, MemoryService, InMemoryMemoryProvider, MessageRole } from "@rmsm/ai-memory";
import { CopilotSessionSummaryService } from "../services/copilot-session-summary.service";
import { FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

describe("CopilotSessionSummaryService", () => {
  it("reads REAL AI-203 ConversationService history and publishes a domain event", async () => {
    const conversationService = new ConversationService(new InMemoryConversationProvider());
    await conversationService.start("session-1");
    await conversationService.addMessage("session-1", MessageRole.USER, "What's the market doing?");
    await conversationService.addMessage("session-1", MessageRole.ASSISTANT, "It's trending up.");

    const eventPublisher = new RecordingEventPublisher();
    const service = new CopilotSessionSummaryService(conversationService, new FixedClock(), new SequentialIdGenerator(), eventPublisher);

    const summary = await service.generate("session-1", "MARKET_QUESTION");
    expect(summary.turnCount).toBe(1);
    expect(summary.narrative).toContain("session-1");
    expect(eventPublisher.published.some((e) => e.kind === "CopilotQuestionAnswered")).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService: persists the session summary as a retrievable SEMANTIC memory", async () => {
    const conversationService = new ConversationService(new InMemoryConversationProvider());
    await conversationService.start("session-memory-test");
    await conversationService.addMessage("session-memory-test", MessageRole.USER, "Question one");

    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const service = new CopilotSessionSummaryService(conversationService, new FixedClock(), new SequentialIdGenerator(), undefined, memoryService);

    const summary = await service.generate("session-memory-test", "GENERAL");

    const result = await memoryRepository.query({ tags: ["trading-copilot"] });
    const persisted = result.entries.find((entry) => entry.content === summary.narrative);

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.tags).toContain("session-memory-test");
    expect(persisted?.metadata.source).toBe("ai-trading-copilot");
  });
});
