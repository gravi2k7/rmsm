import { describe, it, expect } from "vitest";
import { ContextAssembler } from "../services/context-assembler.service";
import { MemoryType, MessageRole } from "../../domain/enums/memory-type.enum";
import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";
import type { ConversationMessage } from "../../domain/entities/conversation-message.entity";

function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "mem-1",
    conversationId: "conv-1",
    organizationId: null,
    type: MemoryType.LONG_TERM,
    content: "The user prefers concise answers.",
    metadata: { id: "mem-1", tags: [], source: "test", author: "test", version: 1 },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: null,
    ...overrides,
  };
}

function makeMessage(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    role: MessageRole.USER,
    content: "What's the weather?",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("ContextAssembler.assemble", () => {
  it("folds memory entries into one systemContext string and keeps messages verbatim", () => {
    const assembler = new ContextAssembler();
    const context = assembler.assemble({
      conversationId: "conv-1",
      messages: [makeMessage()],
      memoryEntries: [makeEntry()],
      maxTokens: 1000,
    });

    expect(context.systemContext).toContain("The user prefers concise answers.");
    expect(context.messages).toHaveLength(1);
    expect(context.includedMemoryEntryIds).toEqual(["mem-1"]);
    expect(context.truncated).toBe(false);
    expect(context.estimatedTokenCount).toBeGreaterThan(0);
  });

  it("marks truncated when the compressor had to drop content", () => {
    const assembler = new ContextAssembler();
    const context = assembler.assemble({
      conversationId: "conv-1",
      messages: [makeMessage({ content: "x".repeat(400) })],
      memoryEntries: [makeEntry({ content: "y".repeat(400) })],
      maxTokens: 5,
    });
    expect(context.truncated).toBe(true);
  });

  it("produces an empty systemContext when no memory entries are relevant", () => {
    const assembler = new ContextAssembler();
    const context = assembler.assemble({ conversationId: null, messages: [], memoryEntries: [], maxTokens: 100 });
    expect(context.systemContext).toBe("");
    expect(context.estimatedTokenCount).toBe(0);
  });
});
