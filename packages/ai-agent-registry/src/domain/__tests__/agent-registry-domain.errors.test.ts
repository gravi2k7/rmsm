import { describe, expect, it } from "vitest";
import {
  AgentAlreadyRegisteredError,
  AgentNotFoundError,
  AgentVersionNotFoundError,
  DuplicateVersionError,
  NoActiveVersionError,
} from "../errors/agent-registry-domain.errors";

describe("agent-registry domain errors", () => {
  it("carry stable error codes", () => {
    expect(new AgentAlreadyRegisteredError("a1").code).toBe("AGENT_ALREADY_REGISTERED");
    expect(new AgentNotFoundError("a1").code).toBe("AGENT_NOT_FOUND");
    expect(new AgentVersionNotFoundError("a1", "1.0.0").code).toBe("AGENT_VERSION_NOT_FOUND");
    expect(new DuplicateVersionError("a1", "1.0.0").code).toBe("DUPLICATE_VERSION");
    expect(new NoActiveVersionError("a1").code).toBe("NO_ACTIVE_VERSION");
  });
});
