import type { ChatRole } from "../enums/chat.enum";
import type { ToolCall } from "./tool-definition.entity";

export interface ChatMessage {
  readonly id: string;
  readonly sessionId: string;
  readonly role: ChatRole;
  readonly content: string;
  readonly toolCalls?: readonly ToolCall[];
  readonly createdAt: Date;
}
