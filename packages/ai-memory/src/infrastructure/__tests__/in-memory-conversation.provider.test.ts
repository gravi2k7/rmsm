import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryConversationProvider } from "../in-memory-conversation.provider";
import { Conversation } from "../../domain/entities/conversation.entity";

describe("InMemoryConversationProvider", () => {
  let provider: InMemoryConversationProvider;

  beforeEach(() => {
    provider = new InMemoryConversationProvider();
  });

  it("returns null for a missing conversation", async () => {
    expect(await provider.findById("missing")).toBeNull();
  });

  it("saves and finds a conversation by id", async () => {
    const conversation = Conversation.start({ id: "conv-1", organizationId: "org-1", now: new Date(), eventId: "evt-1" });
    await provider.save(conversation);
    expect(await provider.findById("conv-1")).toBe(conversation);
  });
});
