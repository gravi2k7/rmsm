import { describe, expect, it } from "vitest";
import { IdentitySessionIdResolver } from "../identity-session-id.resolver";
import { InvalidAgentSessionError } from "../../domain/errors/agent-memory-domain.errors";

describe("IdentitySessionIdResolver", () => {
  const resolver = new IdentitySessionIdResolver();

  it("returns the requested session id when provided", () => {
    expect(resolver.resolve("agent-1", "session-42")).toBe("session-42");
  });

  it("falls back to the agent id when no session id is requested", () => {
    expect(resolver.resolve("agent-1", null)).toBe("agent-1");
  });

  it("throws InvalidAgentSessionError for a blank requested session id", () => {
    expect(() => resolver.resolve("agent-1", "   ")).toThrow(InvalidAgentSessionError);
  });
});
