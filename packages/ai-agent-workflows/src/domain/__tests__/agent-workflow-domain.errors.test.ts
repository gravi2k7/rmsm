import { describe, expect, it } from "vitest";
import { RunNotFoundError, RunNotRetryableError } from "../errors/agent-workflow-domain.errors";

describe("agent-workflow domain errors", () => {
  it("carry stable error codes", () => {
    expect(new RunNotFoundError("r1").code).toBe("RUN_NOT_FOUND");
    expect(new RunNotRetryableError("r1", "RUNNING").code).toBe("RUN_NOT_RETRYABLE");
  });
});
