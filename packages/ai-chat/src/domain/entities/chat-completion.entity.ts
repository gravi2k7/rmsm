import type { ChatRole } from "../enums/chat.enum";
import type { ToolCall, ToolDefinition } from "./tool-definition.entity";
import { ChatStreamChunkType } from "../enums/chat.enum";

/** One turn handed to a `ChatProvider` — deliberately plain
 * `{ role, content }` pairs, the smallest shape every provider's chat
 * API already speaks, so no provider SDK type ever leaks into this
 * package. */
export interface ChatCompletionMessage {
  readonly role: ChatRole;
  readonly content: string;
}

export interface ChatCompletionRequest {
  readonly sessionId: string;
  readonly messages: readonly ChatCompletionMessage[];
  readonly tools?: readonly ToolDefinition[];
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface ChatCompletionResult {
  readonly content: string;
  readonly toolCalls: readonly ToolCall[];
  readonly finishReason: "stop" | "tool_call" | "length";
}

export interface ChatStreamChunk {
  readonly type: ChatStreamChunkType;
  readonly textDelta?: string;
  readonly toolCall?: ToolCall;
}
