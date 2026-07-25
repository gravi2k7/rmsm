import { describe, it, expect } from "vitest";
import { Conversation } from "../entities/conversation.entity";
import { MessageRole } from "../enums/memory-type.enum";
import type { ConversationMessage } from "../entities/conversation-message.entity";

describe("Conversation.start", () => {
  it("raises a ConversationStarted event carrying the new conversation's id", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const conversation = Conversation.start({ id: "conv-1", organizationId: "org-1", now, eventId: "evt-1" });

    expect(conversation.id).toBe("conv-1");
    expect(conversation.organizationId).toBe("org-1");
    expect(conversation.messages).toEqual([]);

    const events = conversation.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "ConversationStarted", conversationId: "conv-1", organizationId: "org-1", eventId: "evt-1" });
  });

  it("defaults organizationId to null and metadata to {}", () => {
    const conversation = Conversation.start({ id: "conv-1", now: new Date(), eventId: "evt-1" });
    expect(conversation.organizationId).toBeNull();
    expect(conversation.metadata).toEqual({});
  });

  it("pullDomainEvents clears events so a second pull is empty", () => {
    const conversation = Conversation.start({ id: "conv-1", now: new Date(), eventId: "evt-1" });
    conversation.pullDomainEvents();
    expect(conversation.pullDomainEvents()).toEqual([]);
  });
});

describe("Conversation.addMessage", () => {
  function makeMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
      id: "msg-1",
      conversationId: "conv-1",
      role: MessageRole.USER,
      content: "Hello",
      createdAt: new Date("2026-01-01T00:01:00Z"),
      ...overrides,
    };
  }

  it("appends the message and raises ConversationUpdated", () => {
    const conversation = Conversation.start({ id: "conv-1", now: new Date("2026-01-01T00:00:00Z"), eventId: "evt-1" });
    conversation.pullDomainEvents();

    conversation.addMessage(makeMessage(), "evt-2");

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0]?.content).toBe("Hello");
    expect(conversation.updatedAt).toEqual(new Date("2026-01-01T00:01:00Z"));

    const events = conversation.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "ConversationUpdated", conversationId: "conv-1", messageId: "msg-1", role: MessageRole.USER });
  });

  it("rejects a message whose conversationId doesn't match this conversation", () => {
    const conversation = Conversation.start({ id: "conv-1", now: new Date(), eventId: "evt-1" });
    expect(() => conversation.addMessage(makeMessage({ conversationId: "conv-2" }), "evt-2")).toThrow();
  });

  it("supports multiple messages, preserving order", () => {
    const conversation = Conversation.start({ id: "conv-1", now: new Date(), eventId: "evt-1" });
    conversation.addMessage(makeMessage({ id: "m1", role: MessageRole.USER, content: "Hi" }), "evt-2");
    conversation.addMessage(makeMessage({ id: "m2", role: MessageRole.ASSISTANT, content: "Hello!" }), "evt-3");
    expect(conversation.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });
});

describe("Conversation.hydrate", () => {
  it("reconstructs a conversation with its messages and raises no events", () => {
    const messages: ConversationMessage[] = [
      { id: "m1", conversationId: "conv-1", role: MessageRole.USER, content: "Hi", createdAt: new Date("2026-01-01T00:01:00Z") },
    ];
    const conversation = Conversation.hydrate({
      id: "conv-1",
      organizationId: "org-1",
      startedAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:01:00Z"),
      metadata: { channel: "web" },
      messages,
    });

    expect(conversation.messages).toEqual(messages);
    expect(conversation.metadata).toEqual({ channel: "web" });
    expect(conversation.pullDomainEvents()).toEqual([]);
  });
});
