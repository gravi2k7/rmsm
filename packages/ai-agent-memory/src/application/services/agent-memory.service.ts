import type { Clock, IdGenerator } from "@rmsm/core";
import {
  ConversationService,
  MemoryService,
  MemoryRetriever,
  ContextAssembler,
  ConversationNotFoundError,
  MemoryType,
  MessageRole,
} from "@rmsm/ai-memory";
import type { Summarizer, MemoryEntry, MemoryResult, ConversationMessage } from "@rmsm/ai-memory";
import type { AgentContext } from "@rmsm/ai-agents";
import type { SessionIdResolver } from "../../repositories/session-id-resolver.interface";
import type { AssembledAgentContext } from "../../domain/entities/assembled-agent-context.entity";
import { InvalidMemoryKeyError } from "../../domain/errors/agent-memory-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type {
  ConversationTurnRecordedEvent,
  WorkingMemoryStoredEvent,
  LongTermMemoryStoredEvent,
  AgentContextAssembledEvent,
  AgentSessionSummarizedEvent,
} from "../../events/agent-memory-domain-events.interface";

/**
 * AI-403: the ONE integration between AI-401's agent framework and
 * AI-203's memory platform. Composes `@rmsm/ai-memory`'s own
 * `ConversationService`, `MemoryService`, `MemoryRetriever`, and
 * `ContextAssembler` directly — no memory persistence, retrieval, or
 * context-assembly logic is reimplemented here (per "no duplicated
 * logic" and "Integrate ONLY with AI-203"). This package's own value is
 * entirely the *mapping* between AI-401's agent-shaped concepts
 * (`agentId`, `AgentContext`) and AI-203's memory-shaped ones
 * (`conversationId`, `MemoryEntry`, `MemoryContext`).
 *
 * - **Conversation memory** — `recordTurn`, backed by `ConversationService`.
 * - **Working memory** — `storeWorkingMemory`, a `MemoryEntry` of
 *   `MemoryType.WORKING`.
 * - **Long-term memory** — `storeLongTermMemory`, `MemoryType.LONG_TERM`.
 * - **Memory retrieval** — `retrieveRelevant`, backed by `MemoryRetriever`.
 * - **Context assembly** — `assembleContext`/`enrichAgentContext`, backed
 *   by `ContextAssembler`.
 * - **Memory summarization** — `summarizeSession`, backed by an injected
 *   `Summarizer` (AI-203's own port).
 */
export class AgentMemoryService {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly memoryService: MemoryService,
    private readonly memoryRetriever: MemoryRetriever,
    private readonly contextAssembler: ContextAssembler,
    private readonly summarizer: Summarizer,
    private readonly sessionIdResolver: SessionIdResolver,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async recordTurn(agentId: string, requestedSessionId: string | null, role: MessageRole, content: string): Promise<void> {
    const sessionId = this.sessionIdResolver.resolve(agentId, requestedSessionId);
    await this.ensureConversation(sessionId);
    await this.conversationService.addMessage(sessionId, role, content);

    const event: ConversationTurnRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ConversationTurnRecorded",
      occurredAt: this.clock.now(),
      aggregateId: sessionId,
      agentId,
      sessionId,
    };
    await this.publish([event]);
  }

  async storeWorkingMemory(agentId: string, requestedSessionId: string | null, key: string, value: unknown): Promise<MemoryEntry> {
    if (!key.trim()) {
      throw new InvalidMemoryKeyError("key must not be empty");
    }
    const sessionId = this.sessionIdResolver.resolve(agentId, requestedSessionId);

    const entry = await this.memoryService.store({
      conversationId: sessionId,
      type: MemoryType.WORKING,
      content: JSON.stringify(value),
      metadata: { tags: [key], source: "agent-working-memory", author: agentId },
    });

    const event: WorkingMemoryStoredEvent = {
      eventId: this.idGenerator.generate(),
      kind: "WorkingMemoryStored",
      occurredAt: this.clock.now(),
      aggregateId: entry.id,
      agentId,
      key,
    };
    await this.publish([event]);
    return entry;
  }

  async storeLongTermMemory(agentId: string, content: string, tags: readonly string[] = []): Promise<MemoryEntry> {
    const entry = await this.memoryService.store({
      conversationId: null,
      type: MemoryType.LONG_TERM,
      content,
      metadata: { tags, source: "agent-long-term-memory", author: agentId },
    });

    const event: LongTermMemoryStoredEvent = {
      eventId: this.idGenerator.generate(),
      kind: "LongTermMemoryStored",
      occurredAt: this.clock.now(),
      aggregateId: entry.id,
      agentId,
      memoryEntryId: entry.id,
    };
    await this.publish([event]);
    return entry;
  }

  async retrieveRelevant(agentId: string, requestedSessionId: string | null, searchText?: string, limit = 10): Promise<MemoryResult> {
    const sessionId = this.sessionIdResolver.resolve(agentId, requestedSessionId);
    return this.memoryRetriever.retrieve({ conversationId: sessionId, searchText, limit });
  }

  async assembleContext(agentId: string, requestedSessionId: string | null, maxTokens: number): Promise<AssembledAgentContext> {
    const sessionId = this.sessionIdResolver.resolve(agentId, requestedSessionId);
    const messages = await this.getMessagesOrEmpty(sessionId);
    const memoryResult = await this.memoryRetriever.retrieve({ conversationId: sessionId, limit: 20 });
    const assembled = this.contextAssembler.assemble({ conversationId: sessionId, messages, memoryEntries: memoryResult.entries, maxTokens });

    const event: AgentContextAssembledEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AgentContextAssembled",
      occurredAt: this.clock.now(),
      aggregateId: sessionId,
      agentId,
      sessionId,
      sourceEntryCount: assembled.includedMemoryEntryIds.length,
    };
    await this.publish([event]);

    const conversationText = assembled.messages.map((message) => `${message.role}: ${message.content}`).join("\n");
    const contextText = [assembled.systemContext, conversationText].filter((part) => part.length > 0).join("\n\n");

    return { agentId, sessionId, contextText, sourceEntryIds: assembled.includedMemoryEntryIds, truncated: assembled.truncated };
  }

  /** Merges assembled memory context into an AI-401 `AgentContext`'s
   * `variables` (under `"memoryContext"`) — the one call site that
   * ties AI-401 and AI-203 together for a caller building an
   * `AgentContext` before a run. */
  async enrichAgentContext(context: AgentContext, maxTokens: number): Promise<AgentContext> {
    const assembled = await this.assembleContext(context.agentId, context.sessionId, maxTokens);
    return { ...context, sessionId: assembled.sessionId, variables: { ...context.variables, memoryContext: assembled.contextText } };
  }

  async summarizeSession(agentId: string, requestedSessionId: string | null): Promise<string> {
    const sessionId = this.sessionIdResolver.resolve(agentId, requestedSessionId);
    const messages = await this.getMessagesOrEmpty(sessionId);
    const transcript = messages.map((message) => `${message.role}: ${message.content}`).join("\n");
    const summary = await this.summarizer.summarize(transcript);

    const event: AgentSessionSummarizedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "AgentSessionSummarized",
      occurredAt: this.clock.now(),
      aggregateId: sessionId,
      agentId,
      sessionId,
    };
    await this.publish([event]);
    return summary;
  }

  private async ensureConversation(sessionId: string): Promise<void> {
    try {
      await this.conversationService.get(sessionId);
    } catch (error) {
      if (error instanceof ConversationNotFoundError) {
        await this.conversationService.start(sessionId, null);
        return;
      }
      throw error;
    }
  }

  private async getMessagesOrEmpty(sessionId: string): Promise<readonly ConversationMessage[]> {
    try {
      return await this.conversationService.getMessages(sessionId);
    } catch (error) {
      if (error instanceof ConversationNotFoundError) {
        return [];
      }
      throw error;
    }
  }

  private async publish(events: readonly import("../../events/agent-memory-domain-events.interface").AgentMemoryDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
