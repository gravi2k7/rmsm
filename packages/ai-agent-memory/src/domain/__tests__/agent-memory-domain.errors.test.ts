import { describe, expect, it } from "vitest";
import { InvalidMemoryKeyError, InvalidAgentSessionError } from "../errors/agent-memory-domain.errors";

describe("agent-memory domain errors", () => {
  it("InvalidMemoryKeyError carries a stable error code", () => {
    const error = new InvalidMemoryKeyError("key must not be empty");
    expect(error.code).toBe("INVALID_MEMORY_KEY");
    expect(error.message).toContain("key must not be empty");
  });

  it("InvalidAgentSessionError carries a stable error code", () => {
    const error = new InvalidAgentSessionError("session id must not be blank");
    expect(error.code).toBe("INVALID_AGENT_SESSION");
    expect(error.message).toContain("session id must not be blank");
  });
});
