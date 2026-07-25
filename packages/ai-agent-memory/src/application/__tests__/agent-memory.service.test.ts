import { describe, expect, it, beforeEach } from "vitest";
import {
  ConversationService,
  MemoryService,
  MemoryRetriever,
  ContextAssembler,
  HeuristicSummarizer,
  InMemoryConversationProvider,
  InMemoryMemoryProvider,
  MessageRole,
  MemoryType,
} from "@rmsm/ai-memory";
import type { AgentContext } from "@rmsm/ai-agents";
import { AgentMemoryService } from "../services/agent-memory.service";
import { IdentitySessionIdResolver } from "../../infrastructure/identity-session-id.resolver";
import { InvalidMemoryKeyError } from "../../domain/errors/agent-memory-domain.errors";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

function buildService() {
  const conversationRepository = new InMemoryConversationProvider();
  const memoryRepository = new InMemoryMemoryProvider();
  const events = new RecordingEventPublisher();

  const conversationService = new ConversationService(conversationRepository);
  const memoryService = new MemoryService(memoryRepository);
  const memoryRetriever = new MemoryRetriever(memoryRepository);
  const contextAssembler = new ContextAssembler();
  const summarizer = new HeuristicSummarizer();
  const sessionIdResolver = new IdentitySessionIdResolver();

  const service = new AgentMemoryService(
    conversationService,
    memoryService,
    memoryRetriever,
    contextAssembler,
    summarizer,
    sessionIdResolver,
    new SystemLikeClock(),
    new SequentialIdGenerator(),
    events,
  );

  return { service, events, memoryService };
}

describe("AgentMemoryService", () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it("records conversation turns, creating the session on first use", async () => {
    const { service, events } = ctx;
    await service.recordTurn("agent-1", null, MessageRole.USER, "hello there");
    await service.recordTurn("agent-1", null, MessageRole.ASSISTANT, "hi! how can I help?");

    const context = await service.assembleContext("agent-1", null, 500);
    expect(context.contextText).toContain("hello there");
    expect(context.contextText).toContain("hi! how can I help?");
    expect(events.published.filter((e) => e.kind === "ConversationTurnRecorded")).toHaveLength(2);
  });

  it("stores and retrieves working memory scoped to a session", async () => {
    const { service, memoryService } = ctx;
    const entry = await service.storeWorkingMemory("agent-1", "session-a", "plan", { step: 1 });
    expect(entry.type).toBe(MemoryType.WORKING);
    expect(entry.conversationId).toBe("session-a");

    const fetched = await memoryService.get(entry.id);
    expect(fetched.content).toContain("step");
  });

  it("rejects an empty working-memory key", async () => {
    const { service } = ctx;
    await expect(service.storeWorkingMemory("agent-1", "session-a", "  ", {})).rejects.toThrow(InvalidMemoryKeyError);
  });

  it("stores long-term memory independent of any session", async () => {
    const { service } = ctx;
    const entry = await service.storeLongTermMemory("agent-1", "the user prefers concise answers", ["preference"]);
    expect(entry.type).toBe(MemoryType.LONG_TERM);
    expect(entry.conversationId).toBeNull();
  });

  it("retrieves relevant memory entries via the AI-203 retriever", async () => {
    const { service } = ctx;
    await service.storeWorkingMemory("agent-1", "session-a", "note", "remember the deadline is friday");

    const result = await service.retrieveRelevant("agent-1", "session-a", "deadline");
    expect(result.entries.length).toBeGreaterThan(0);
  });

  it("assembles context combining conversation turns and stored memory", async () => {
    const { service, events } = ctx;
    await service.recordTurn("agent-1", "session-a", MessageRole.USER, "what is the plan?");
    await service.storeWorkingMemory("agent-1", "session-a", "plan", "ship the report by friday");

    const assembled = await service.assembleContext("agent-1", "session-a", 1000);
    expect(assembled.agentId).toBe("agent-1");
    expect(assembled.sessionId).toBe("session-a");
    expect(assembled.contextText.length).toBeGreaterThan(0);
    expect(events.published.some((e) => e.kind === "AgentContextAssembled")).toBe(true);
  });

  it("assembles an empty-but-valid context for a session with no history yet", async () => {
    const { service } = ctx;
    const assembled = await service.assembleContext("agent-new", null, 500);
    expect(assembled.truncated).toBe(false);
    expect(assembled.sourceEntryIds).toEqual([]);
  });

  it("enriches an AI-401 AgentContext's variables with assembled memory context", async () => {
    const { service } = ctx;
    await service.recordTurn("agent-1", "session-a", MessageRole.USER, "remember my name is Ravi");

    const agentContext: AgentContext = { agentId: "agent-1", sessionId: "session-a", goals: [], variables: {} };
    const enriched = await service.enrichAgentContext(agentContext, 500);

    expect(enriched.sessionId).toBe("session-a");
    expect(String(enriched.variables.memoryContext)).toContain("remember my name is Ravi");
  });

  it("summarizes a session's conversation via the injected AI-203 Summarizer", async () => {
    const { service, events } = ctx;
    await service.recordTurn("agent-1", "session-a", MessageRole.USER, "Our project deadline moved to next Friday. Please confirm you understand.");
    await service.recordTurn("agent-1", "session-a", MessageRole.ASSISTANT, "Confirmed, I will treat next Friday as the new deadline.");

    const summary = await service.summarizeSession("agent-1", "session-a");
    expect(summary.length).toBeGreaterThan(0);
    expect(events.published.some((e) => e.kind === "AgentSessionSummarized")).toBe(true);
  });
});
