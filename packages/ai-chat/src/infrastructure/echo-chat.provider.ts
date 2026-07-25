import type { ChatProvider } from "../repositories/chat-provider.interface";
import type { ChatCompletionRequest, ChatCompletionResult, ChatStreamChunk } from "../domain/entities/chat-completion.entity";
import { ChatStreamChunkType } from "../domain/enums/chat.enum";

/**
 * The real, default `ChatProvider` — deterministically echoes the last
 * user message back with a fixed prefix. This is deliberately the ONLY
 * concrete `ChatProvider` this package ships (no OpenAI/Anthropic/etc.
 * SDK dependency anywhere) — useful for tests, local dev, and wiring
 * verification; a real LLM-backed adapter is a separate future
 * package's concern, implementing this same interface.
 */
export class EchoChatProvider implements ChatProvider {
  async complete(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    const lastMessage = request.messages[request.messages.length - 1];
    return {
      content: `echo: ${lastMessage?.content ?? ""}`,
      toolCalls: [],
      finishReason: "stop",
    };
  }

  async *streamComplete(request: ChatCompletionRequest): AsyncIterable<ChatStreamChunk> {
    const result = await this.complete(request);
    for (const word of result.content.split(" ")) {
      yield { type: ChatStreamChunkType.TEXT_DELTA, textDelta: `${word} ` };
    }
    yield { type: ChatStreamChunkType.DONE };
  }
}
