import type { ChatCompletionRequest, ChatCompletionResult, ChatStreamChunk } from "../domain/entities/chat-completion.entity";

/**
 * The provider-independence boundary the whole package is built
 * around — no concrete implementation of this interface calls a real
 * LLM API (per "no provider-specific implementation"). A real
 * OpenAI/Anthropic/etc. adapter is a future, separate package's
 * concern; this package ships only `EchoChatProvider`, a deterministic
 * test/dev double.
 */
export interface ChatProvider {
  complete(request: ChatCompletionRequest): Promise<ChatCompletionResult>;
  streamComplete(request: ChatCompletionRequest): AsyncIterable<ChatStreamChunk>;
}
