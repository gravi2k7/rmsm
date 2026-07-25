// @rmsm/ai-chat public API (AI-301 Enterprise Chat Engine)

// Domain: enums
export { ChatRole, CHAT_ROLES, ChatStreamChunkType, CHAT_STREAM_CHUNK_TYPES } from "./domain/enums/chat.enum";

// Domain: entities
export type { ToolDefinition, ToolCall, ToolResult } from "./domain/entities/tool-definition.entity";
export type { ChatMessage } from "./domain/entities/chat-message.entity";
export type {
  ChatCompletionMessage,
  ChatCompletionRequest,
  ChatCompletionResult,
  ChatStreamChunk,
} from "./domain/entities/chat-completion.entity";

// Domain: errors
export {
  ChatSessionNotFoundError,
  DuplicateChatSessionError,
  ToolNotRegisteredError,
  ChatProviderError,
  InvalidChatRequestError,
} from "./domain/errors/chat-domain.errors";

// Ports
export type { ChatProvider } from "./repositories/chat-provider.interface";
export type { ToolRegistry, ToolHandler } from "./repositories/tool-registry.interface";

// Events
export type {
  ChatSessionStartedEvent,
  ChatMessageSentEvent,
  ChatResponseCompletedEvent,
  ToolInvokedEvent,
  ToolCompletedEvent,
  ChatFailedEvent,
  ChatDomainEvent,
} from "./events/chat-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { ChatOrchestratorService } from "./application/services/chat-orchestrator.service";

// Infrastructure
export { EchoChatProvider } from "./infrastructure/echo-chat.provider";
export { DefaultToolRegistry } from "./infrastructure/default-tool.registry";
export { InMemoryEventPublisher, type ChatEventListener } from "./infrastructure/in-memory-event-publisher";
