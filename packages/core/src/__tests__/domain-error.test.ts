import { describe, expect, it } from "vitest";
import {
  ConcurrencyConflictError,
  DomainError,
  EntityNotFoundError,
  IllegalStateTransitionError,
  InvariantViolationError,
} from "../errors";

class TestDomainError extends DomainError {
  constructor(message: string) {
    super(message, "TEST_ERROR");
  }
}

describe("DomainError", () => {
  it("carries a stable code and the constructor's own name", () => {
    const error = new TestDomainError("something went wrong");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.name).toBe("TestDomainError");
    expect(error.message).toBe("something went wrong");
    expect(error).toBeInstanceOf(Error);
  });

  it("has no statusCode field — that's an application-layer concern", () => {
    const error = new TestDomainError("x");
    expect((error as unknown as { statusCode?: unknown }).statusCode).toBeUndefined();
  });
});

describe("InvariantViolationError", () => {
  it("carries the INVARIANT_VIOLATION code", () => {
    const error = new InvariantViolationError("name must not be empty");
    expect(error.code).toBe("INVARIANT_VIOLATION");
    expect(error.message).toBe("name must not be empty");
  });
});

describe("EntityNotFoundError", () => {
  it("formats a message including the entity name and id", () => {
    const error = new EntityNotFoundError("Strategy", "abc-123");
    expect(error.code).toBe("ENTITY_NOT_FOUND");
    expect(error.message).toBe("Strategy (abc-123) was not found.");
  });
});

describe("ConcurrencyConflictError", () => {
  it("formats a message including the entity name and id", () => {
    const error = new ConcurrencyConflictError("Strategy", "abc-123");
    expect(error.code).toBe("CONCURRENCY_CONFLICT");
    expect(error.message).toContain("Strategy (abc-123)");
  });
});

describe("IllegalStateTransitionError", () => {
  it("formats a message including entity, from-state, and attempted transition", () => {
    const error = new IllegalStateTransitionError("StrategyVersion", "DRAFT", "publish");
    expect(error.code).toBe("ILLEGAL_STATE_TRANSITION");
    expect(error.message).toBe('StrategyVersion in state "DRAFT" cannot perform "publish".');
  });
});
