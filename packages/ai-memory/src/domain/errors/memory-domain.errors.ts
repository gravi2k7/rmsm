import { DomainError } from "@rmsm/core";

/**
 * AI-203's own domain error hierarchy, built directly on `@rmsm/core`'s
 * `DomainError` rather than a new framework-free base of its own —
 * unlike `@rmsm/ai-prompts`' `PromptDomainError` (written before this
 * repo had `@rmsm/core` established as the platform's shared kernel),
 * this package depends on `@rmsm/core` already (for `AggregateRoot`,
 * `Guard`, `Result`), so reusing its `DomainError` here is the correct
 * "reuse existing abstractions" call, not an inconsistency with
 * AI-202's own choice — that choice was correct for where the platform
 * was when it was made.
 */

export class MemoryNotFoundError extends DomainError {
  constructor(id: string) {
    super(`No memory entry found with id "${id}".`, "MEMORY_NOT_FOUND");
  }
}

export class ConversationNotFoundError extends DomainError {
  constructor(id: string) {
    super(`No conversation found with id "${id}".`, "CONVERSATION_NOT_FOUND");
  }
}

export class DuplicateConversationError extends DomainError {
  constructor(id: string) {
    super(`A conversation with id "${id}" already exists.`, "DUPLICATE_CONVERSATION");
  }
}

/** Raised when a caller tries to retrieve a memory entry past its `expiresAt`. */
export class MemoryExpiredError extends DomainError {
  constructor(id: string) {
    super(`Memory entry "${id}" has expired and is no longer retrievable.`, "MEMORY_EXPIRED");
  }
}

/** Optimistic-concurrency conflict — mirrors `packages/database`'s own `OptimisticLockError` shape, without depending on that package. */
export class MemoryVersionConflictError extends DomainError {
  constructor(id: string, expectedVersion: number, actualVersion: number) {
    super(`Memory entry "${id}" version conflict: expected ${expectedVersion}, found ${actualVersion}.`, "MEMORY_VERSION_CONFLICT");
  }
}

export class InvalidMemoryQueryError extends DomainError {
  constructor(reason: string) {
    super(`Invalid memory query: ${reason}`, "INVALID_MEMORY_QUERY");
  }
}

export class MemoryCompressionError extends DomainError {
  constructor(reason: string) {
    super(`Memory compression failed: ${reason}`, "MEMORY_COMPRESSION_FAILED");
  }
}
