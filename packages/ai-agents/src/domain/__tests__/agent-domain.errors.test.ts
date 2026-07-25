import { describe, it, expect } from "vitest";
import {
  AgentNotFoundError,
  InvalidAgentConfigError,
  ReasoningStrategyNotFoundError,
  AgentExecutionError,
  MaxStepsExceededError,
  ExecutionNotFoundError,
} from "../errors/agent-domain.errors";

describe("agent domain errors", () => {
  it("AgentNotFoundError carries a stable code", () => {
    expect(new AgentNotFoundError("a1").code).toBe("AGENT_NOT_FOUND");
  });
  it("InvalidAgentConfigError carries a stable code", () => {
    expect(new InvalidAgentConfigError("bad").code).toBe("INVALID_AGENT_CONFIG");
  });
  it("ReasoningStrategyNotFoundError carries a stable code", () => {
    expect(new ReasoningStrategyNotFoundError("s1").code).toBe("REASONING_STRATEGY_NOT_FOUND");
  });
  it("AgentExecutionError carries a stable code", () => {
    expect(new AgentExecutionError("a1", "boom").code).toBe("AGENT_EXECUTION_FAILED");
  });
  it("MaxStepsExceededError carries a stable code", () => {
    expect(new MaxStepsExceededError("a1", 5).code).toBe("MAX_STEPS_EXCEEDED");
  });
  it("ExecutionNotFoundError carries a stable code", () => {
    expect(new ExecutionNotFoundError("e1").code).toBe("EXECUTION_NOT_FOUND");
  });
});
