import { describe, expect, it } from "vitest";
import { RoleNotFoundError, RoleAlreadyExistsError, SecretNotFoundError, RateLimitExceededError } from "../errors/agent-security-domain.errors";

describe("agent-security domain errors", () => {
  it("carry stable error codes", () => {
    expect(new RoleNotFoundError("r1").code).toBe("ROLE_NOT_FOUND");
    expect(new RoleAlreadyExistsError("r1").code).toBe("ROLE_ALREADY_EXISTS");
    expect(new SecretNotFoundError("s1").code).toBe("SECRET_NOT_FOUND");
    expect(new RateLimitExceededError("k1").code).toBe("RATE_LIMIT_EXCEEDED");
  });
});
