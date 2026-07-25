import { DomainError } from "@rmsm/core";

export class ChatSessionNotFoundError extends DomainError {
  constructor(sessionId: string) {
    super(`Chat session "${sessionId}" was not found.`, "CHAT_SESSION_NOT_FOUND");
  }
}

export class DuplicateChatSessionError extends DomainError {
  constructor(sessionId: string) {
    super(`Chat session "${sessionId}" already exists.`, "DUPLICATE_CHAT_SESSION");
  }
}

export class ToolNotRegisteredError extends DomainError {
  constructor(toolName: string) {
    super(`Tool "${toolName}" is not registered.`, "TOOL_NOT_REGISTERED");
  }
}

export class ChatProviderError extends DomainError {
  constructor(reason: string) {
    super(`Chat provider failed: ${reason}`, "CHAT_PROVIDER_ERROR");
  }
}

export class InvalidChatRequestError extends DomainError {
  constructor(reason: string) {
    super(`Invalid chat request: ${reason}`, "INVALID_CHAT_REQUEST");
  }
}
