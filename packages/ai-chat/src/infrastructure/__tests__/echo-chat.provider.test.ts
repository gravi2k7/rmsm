import { describe, it, expect } from "vitest";
import { EchoChatProvider } from "../echo-chat.provider";
import { ChatRole, ChatStreamChunkType } from "../../domain/enums/chat.enum";

describe("EchoChatProvider", () => {
  it("echoes the last user message with a fixed prefix", async () => {
    const provider = new EchoChatProvider();
    const result = await provider.complete({ sessionId: "s1", messages: [{ role: ChatRole.USER, content: "hi" }] });
    expect(result.content).toBe("echo: hi");
    expect(result.finishReason).toBe("stop");
    expect(result.toolCalls).toEqual([]);
  });

  it("streams the echoed content as text deltas followed by a done chunk", async () => {
    const provider = new EchoChatProvider();
    const chunks = [];
    for await (const chunk of provider.streamComplete({ sessionId: "s1", messages: [{ role: ChatRole.USER, content: "hi there" }] })) {
      chunks.push(chunk);
    }
    expect(chunks[chunks.length - 1]?.type).toBe(ChatStreamChunkType.DONE);
    const text = chunks
      .filter((c) => c.type === ChatStreamChunkType.TEXT_DELTA)
      .map((c) => c.textDelta)
      .join("");
    expect(text.trim()).toBe("echo: hi there");
  });
});
