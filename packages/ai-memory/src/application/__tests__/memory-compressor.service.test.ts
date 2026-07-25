import { describe, it, expect } from "vitest";
import { MemoryCompressor } from "../services/memory-compressor.service";
import { MemoryCompressionError } from "../../domain/errors/memory-domain.errors";
import { MemoryType, MessageRole } from "../../domain/enums/memory-type.enum";
import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";
import type { ConversationMessage } from "../../domain/entities/conversation-message.entity";

function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "mem-1",
    conversationId: null,
    organizationId: null,
    type: MemoryType.LONG_TERM,
    content: "x".repeat(40), // 10 estimated tokens
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
    content: "x".repeat(20), // 5 estimated tokens
    createdAt: new Date(),
    ...overrides,
  };
}

describe("MemoryCompressor.compress", () => {
  it("throws MemoryCompressionError for a non-positive token budget", () => {
    const compressor = new MemoryCompressor();
    expect(() => compressor.compress({ entries: [], messages: [], maxTokens: 0 })).toThrow(MemoryCompressionError);
  });

  it("keeps everything when the budget is generous", () => {
    const compressor = new MemoryCompressor();
    const result = compressor.compress({ entries: [makeEntry()], messages: [makeMessage()], maxTokens: 1000 });
    expect(result.truncated).toBe(false);
    expect(result.entries).toHaveLength(1);
    expect(result.messages).toHaveLength(1);
  });

  it("keeps the most recent messages first when the budget is tight", () => {
    const compressor = new MemoryCompressor();
    const older = makeMessage({ id: "m1", content: "x".repeat(20) }); // 5 tokens
    const newer = makeMessage({ id: "m2", content: "y".repeat(20) }); // 5 tokens
    const result = compressor.compress({ entries: [], messages: [older, newer], maxTokens: 5 });

    expect(result.messages.map((m) => m.id)).toEqual(["m2"]);
    expect(result.truncated).toBe(true);
  });

  it("keeps higher-importance entries first when the budget is tight", () => {
    const compressor = new MemoryCompressor();
    const lowImportance = makeEntry({ id: "e1", content: "x".repeat(40), metadata: { id: "e1", tags: [], source: "t", author: "t", version: 1, importance: 0.1 } });
    const highImportance = makeEntry({ id: "e2", content: "y".repeat(40), metadata: { id: "e2", tags: [], source: "t", author: "t", version: 1, importance: 0.9 } });
    const result = compressor.compress({ entries: [lowImportance, highImportance], messages: [], maxTokens: 10 });

    expect(result.entries.map((e) => e.id)).toEqual(["e2"]);
    expect(result.truncated).toBe(true);
  });
});
