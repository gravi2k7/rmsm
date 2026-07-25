import type { IdGenerator } from "@rmsm/core";
import { ConversationService, MessageRole } from "@rmsm/ai-memory";
import { ChatRole, ChatStreamChunkType } from "../../domain/enums/chat.enum";
import type { ChatCompletionMessage, ChatCompletionResult, ChatStreamChunk } from "../../domain/entities/chat-completion.entity";
import type { ToolDefinition, ToolCall } from "../../domain/entities/tool-definition.entity";
import { InvalidChatRequestError } from "../../domain/errors/chat-domain.errors";
import type { ChatProvider } from "../../repositories/chat-provider.interface";
import type { ToolRegistry } from "../../repositories/tool-registry.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type {
  ChatSessionStartedEvent,
  ChatMessageSentEvent,
  ChatResponseCompletedEvent,
  ToolInvokedEvent,
  ToolCompletedEvent,
  ChatFailedEvent,
  ChatDomainEvent,
} from "../../events/chat-domain-events.interface";

const MAX_TOOL_ROUNDS = 3;

function toChatRole(role: MessageRole): ChatRole {
  switch (role) {
    case MessageRole.SYSTEM:
      return ChatRole.SYSTEM;
    case MessageRole.USER:
      return ChatRole.USER;
    case MessageRole.ASSISTANT:
      return ChatRole.ASSISTANT;
    default:
      return ChatRole.ASSISTANT;
  }
}

/**
 * The orchestration core of AI-301: owns a chat turn end-to-end by
 * *composing* AI-202/AI-203's own services, never re-implementing what
 * they already do.
 *
 * - **Memory integration**: conversation turns are persisted through
 *   `@rmsm/ai-memory`'s own `ConversationService` — this class never
 *   touches a `ConversationRepository` directly.
 * - **Prompt integration**: callers render a system prompt with
 *   `@rmsm/ai-prompts`' own `PromptCompiler` and hand this class the
 *   resulting `CompiledPrompt.systemPrompt` string via
 *   `startSession()`'s `systemPrompt` parameter — this class never
 *   renders a template itself.
 * - **Provider abstraction**: talks to the model only through the
 *   injected `ChatProvider` port.
 * - **Tool invocation**: a `finishReason: "tool_call"` response is
 *   resolved by invoking the matching handler(s) via `ToolRegistry`,
 *   feeding results back to the provider, for up to `MAX_TOOL_ROUNDS`
 *   rounds before giving up — the model, not this class, decides when
 *   to stop calling tools.
 *
 * Tool-role turns are intentionally NOT persisted to `ai-memory`
 * conversation history: they're scaffolding for producing one
 * assistant turn, not conversational memory in their own right.
 */
export class ChatOrchestratorService {
  constructor(
    private readonly chatProvider: ChatProvider,
    private readonly conversationService: ConversationService,
    private readonly idGenerator: IdGenerator,
    private readonly toolRegistry?: ToolRegistry,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async startSession(sessionId: string, organizationId?: string | null, systemPrompt?: string): Promise<void> {
    await this.conversationService.start(sessionId, organizationId ?? null);
    if (systemPrompt) {
      await this.conversationService.addMessage(sessionId, MessageRole.SYSTEM, systemPrompt);
    }

    const event: ChatSessionStartedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ChatSessionStarted",
      occurredAt: new Date(),
      aggregateId: sessionId,
      sessionId,
    };
    await this.publish([event]);
  }

  async sendMessage(sessionId: string, content: string, tools?: readonly ToolDefinition[]): Promise<ChatCompletionResult> {
    if (!content.trim()) {
      throw new InvalidChatRequestError("message content must not be empty");
    }

    const userMessage = await this.conversationService.addMessage(sessionId, MessageRole.USER, content);
    await this.publish([this.messageSentEvent(sessionId, userMessage.id)]);

    try {
      const result = await this.runToProviderCompletion(sessionId, tools);
      await this.conversationService.addMessage(sessionId, MessageRole.ASSISTANT, result.content);
      await this.publish([this.completedEvent(sessionId, result.finishReason)]);
      return result;
    } catch (error) {
      await this.publish([this.failedEvent(sessionId, error)]);
      throw error;
    }
  }

  async *streamMessage(sessionId: string, content: string): AsyncGenerator<ChatStreamChunk> {
    if (!content.trim()) {
      throw new InvalidChatRequestError("message content must not be empty");
    }

    const userMessage = await this.conversationService.addMessage(sessionId, MessageRole.USER, content);
    await this.publish([this.messageSentEvent(sessionId, userMessage.id)]);

    const messages = await this.historyAsCompletionMessages(sessionId);
    let full = "";
    for await (const chunk of this.chatProvider.streamComplete({ sessionId, messages })) {
      if (chunk.type === ChatStreamChunkType.TEXT_DELTA && chunk.textDelta) {
        full += chunk.textDelta;
      }
      yield chunk;
    }

    await this.conversationService.addMessage(sessionId, MessageRole.ASSISTANT, full.trim());
    await this.publish([this.completedEvent(sessionId, "stop")]);
  }

  private async runToProviderCompletion(sessionId: string, tools?: readonly ToolDefinition[]): Promise<ChatCompletionResult> {
    let messages = await this.historyAsCompletionMessages(sessionId);

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const result = await this.chatProvider.complete({ sessionId, messages, tools });

      if (result.finishReason !== "tool_call" || result.toolCalls.length === 0) {
        return result;
      }
      if (!this.toolRegistry) {
        return result;
      }

      const toolResults = await Promise.all(result.toolCalls.map((call) => this.invokeTool(sessionId, call)));
      messages = [
        ...messages,
        { role: ChatRole.ASSISTANT, content: result.content },
        ...toolResults.map((toolResult) => ({ role: ChatRole.TOOL, content: toolResult.content })),
      ];
    }

    // Ran out of tool rounds — return the last completion as-is rather
    // than looping forever.
    return this.chatProvider.complete({ sessionId, messages, tools });
  }

  private async invokeTool(sessionId: string, call: ToolCall) {
    await this.publish([
      {
        eventId: this.idGenerator.generate(),
        kind: "ToolInvoked",
        occurredAt: new Date(),
        aggregateId: sessionId,
        sessionId,
        toolName: call.toolName,
        toolCallId: call.id,
      } satisfies ToolInvokedEvent,
    ]);

    const result = await this.toolRegistry!.invoke(call);

    await this.publish([
      {
        eventId: this.idGenerator.generate(),
        kind: "ToolCompleted",
        occurredAt: new Date(),
        aggregateId: sessionId,
        sessionId,
        toolName: call.toolName,
        toolCallId: call.id,
        isError: result.isError,
      } satisfies ToolCompletedEvent,
    ]);

    return result;
  }

  private async historyAsCompletionMessages(sessionId: string): Promise<ChatCompletionMessage[]> {
    const history = await this.conversationService.getMessages(sessionId);
    return history.map((message) => ({ role: toChatRole(message.role), content: message.content }));
  }

  private messageSentEvent(sessionId: string, messageId: string): ChatMessageSentEvent {
    return {
      eventId: this.idGenerator.generate(),
      kind: "ChatMessageSent",
      occurredAt: new Date(),
      aggregateId: sessionId,
      sessionId,
      messageId,
    };
  }

  private completedEvent(sessionId: string, finishReason: "stop" | "tool_call" | "length"): ChatResponseCompletedEvent {
    return {
      eventId: this.idGenerator.generate(),
      kind: "ChatResponseCompleted",
      occurredAt: new Date(),
      aggregateId: sessionId,
      sessionId,
      finishReason,
    };
  }

  private failedEvent(sessionId: string, error: unknown): ChatFailedEvent {
    return {
      eventId: this.idGenerator.generate(),
      kind: "ChatFailed",
      occurredAt: new Date(),
      aggregateId: sessionId,
      sessionId,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  private async publish(events: readonly ChatDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
