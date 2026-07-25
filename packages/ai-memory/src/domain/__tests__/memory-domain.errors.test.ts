import { describe, it, expect } from "vitest";
import { DomainError } from "@rmsm/core";
import {
  MemoryNotFoundError,
  ConversationNotFoundError,
  DuplicateConversationError,
  MemoryExpiredError,
  MemoryVersionConflictError,
  InvalidMemoryQueryError,
  MemoryCompressionError,
} from "../errors/memory-domain.errors";

describe("memory domain error hierarchy", () => {
  it("every error extends @rmsm/core's DomainError and carries a stable code", () => {
    const cases: Array<[DomainError, string]> = [
      [new MemoryNotFoundError("mem-1"), "MEMORY_NOT_FOUND"],
      [new ConversationNotFoundError("conv-1"), "CONVERSATION_NOT_FOUND"],
      [new DuplicateConversationError("conv-1"), "DUPLICATE_CONVERSATION"],
      [new MemoryExpiredError("mem-1"), "MEMORY_EXPIRED"],
      [new MemoryVersionConflictError("mem-1", 2, 1), "MEMORY_VERSION_CONFLICT"],
      [new InvalidMemoryQueryError("limit must be positive"), "INVALID_MEMORY_QUERY"],
      [new MemoryCompressionError("nothing left to drop"), "MEMORY_COMPRESSION_FAILED"],
    ];

    for (const [error, code] of cases) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(code);
    }
  });

  it("MemoryVersionConflictError message names both versions", () => {
    const error = new MemoryVersionConflictError("mem-1", 3, 1);
    expect(error.message).toContain("3");
    expect(error.message).toContain("1");
  });
});
