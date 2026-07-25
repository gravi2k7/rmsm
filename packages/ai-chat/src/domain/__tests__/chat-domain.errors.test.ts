import { describe, it, expect } from "vitest";
import {
  ChatSessionNotFoundError,
  DuplicateChatSessionError,
  ToolNotRegisteredError,
  ChatProviderError,
  InvalidChatRequestError,
} from "../errors/chat-domain.errors";

describe("chat domain errors", () => {
  it("ChatSessionNotFoundError carries a stable code", () => {
    expect(new ChatSessionNotFoundError("s1").code).toBe("CHAT_SESSION_NOT_FOUND");
  });
  it("DuplicateChatSessionError carries a stable code", () => {
    expect(new DuplicateChatSessionError("s1").code).toBe("DUPLICATE_CHAT_SESSION");
  });
  it("ToolNotRegisteredError carries a stable code and tool name", () => {
    const error = new ToolNotRegisteredError("search");
    expect(error.code).toBe("TOOL_NOT_REGISTERED");
    expect(error.message).toContain("search");
  });
  it("ChatProviderError carries a stable code", () => {
    expect(new ChatProviderError("timeout").code).toBe("CHAT_PROVIDER_ERROR");
  });
  it("InvalidChatRequestError carries a stable code", () => {
    expect(new InvalidChatRequestError("empty").code).toBe("INVALID_CHAT_REQUEST");
  });
});
