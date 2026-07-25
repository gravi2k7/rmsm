/** Own enum, not a re-export of `@rmsm/ai-memory`'s `MessageRole` —
 * ai-chat maps to/from that enum at its integration boundary
 * (`ChatOrchestratorService`) rather than depending on its exact
 * member set, the same "observe through data, not a shared enum"
 * discipline AI-204 applied to AI-203. */
export enum ChatRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
  TOOL = "tool",
}

export const CHAT_ROLES = Object.values(ChatRole) as readonly ChatRole[];

export enum ChatStreamChunkType {
  TEXT_DELTA = "text_delta",
  TOOL_CALL = "tool_call",
  DONE = "done",
}

export const CHAT_STREAM_CHUNK_TYPES = Object.values(ChatStreamChunkType) as readonly ChatStreamChunkType[];
