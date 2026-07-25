import { describe, it, expect, beforeEach } from "vitest";
import { ConversationService, InMemoryConversationProvider, MessageRole } from "@rmsm/ai-memory";
import { PromptCompiler } from "@rmsm/ai-prompts";
import { ChatOrchestratorService } from "../services/chat-orchestrator.service";
import { EchoChatProvider } from "../../infrastructure/echo-chat.provider";
import { DefaultToolRegistry } from "../../infrastructure/default-tool.registry";
import { InvalidChatRequestError } from "../../domain/errors/chat-domain.errors";
import { SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("ChatOrchestratorService", () => {
  let conversationService: ConversationService;
  let orchestrator: ChatOrchestratorService;
  let events: RecordingEventPublisher;

  beforeEach(() => {
    conversationService = new ConversationService(new InMemoryConversationProvider());
    events = new RecordingEventPublisher();
    orchestrator = new ChatOrchestratorService(new EchoChatProvider(), conversationService, new SequentialIdGenerator(), new DefaultToolRegistry(), events);
  });

  it("integrates with a real @rmsm/ai-prompts CompiledPrompt as the session's system prompt", async () => {
    const compiler = new PromptCompiler();
    const compiled = compiler.compile({ systemPrompt: "You are a helpful {{persona}}.", userPrompt: "", variables: { persona: "assistant" } });

    await orchestrator.startSession("s1", "org-1", compiled.systemPrompt);

    const messages = await conversationService.getMessages("s1");
    expect(messages[0]?.role).toBe(MessageRole.SYSTEM);
    expect(messages[0]?.content).toBe("You are a helpful assistant.");
    expect(events.published.map((e) => e.kind)).toContain("ChatSessionStarted");
  });

  it("persists the user turn and the assistant turn through @rmsm/ai-memory's real ConversationService", async () => {
    await orchestrator.startSession("s1", null);
    const result = await orchestrator.sendMessage("s1", "hello there");

    expect(result.content).toBe("echo: hello there");

    const messages = await conversationService.getMessages("s1");
    expect(messages.map((m) => m.role)).toEqual([MessageRole.USER, MessageRole.ASSISTANT]);
    expect(messages[1]?.content).toBe("echo: hello there");
  });

  it("publishes ChatMessageSent and ChatResponseCompleted for a normal turn", async () => {
    await orchestrator.startSession("s1", null);
    await orchestrator.sendMessage("s1", "hi");

    expect(events.published.map((e) => e.kind)).toEqual(
      expect.arrayContaining(["ChatSessionStarted", "ChatMessageSent", "ChatResponseCompleted"]),
    );
  });

  it("rejects an empty message", async () => {
    await orchestrator.startSession("s1", null);
    await expect(orchestrator.sendMessage("s1", "   ")).rejects.toThrow(InvalidChatRequestError);
  });

  it("streams a response and persists the accumulated text as the assistant turn", async () => {
    await orchestrator.startSession("s1", null);

    const chunks = [];
    for await (const chunk of orchestrator.streamMessage("s1", "stream this")) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);

    const messages = await conversationService.getMessages("s1");
    const assistantTurn = messages.find((m) => m.role === MessageRole.ASSISTANT);
    expect(assistantTurn?.content).toBe("echo: stream this");
  });
});
